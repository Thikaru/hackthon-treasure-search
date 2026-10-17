using System.Collections;
using UnityEngine;

namespace TreasureStage
{
    /// <summary>
    /// 宝箱とお宝の見せ場を描く舞台。カメラ・光の筋・後光・影・宝箱・お宝・きらめきを持つ。
    /// 背景は透明で、Web 側の写真背景の上に重ねて表示する（Transparent=false で写真を自前で描く）。
    /// </summary>
    public class Stage : MonoBehaviour
    {
        public bool Transparent = true;

        Camera _cam;
        Shader _lit, _unlit, _add;
        Texture2D _radial, _sparkleTex;
        ChestRig _chest;
        Transform _rays, _halo, _treasure, _treasureHalo, _shadow, _bg;
        Material _raysMat, _haloMat, _treasureMat, _treasureHaloMat, _bgMat, _burstMat;
        Transform _burst;
        ParticleSystem _dust, _sparkBurst;
        StagePalette _pal;
        string _tod = "day", _scene = "chest", _kind = "gem";

        float _dragYaw, _dragVel, _wiggle = 1, _shake = 1;
        bool _busy, _opened, _dragging;
        float _raysBoost, _lidAngle, _treasureRise;

        void Awake()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            // Unity は既定でページ全体のキー入力を横取りし、入力欄の削除キーなどが効かなくなる。
            // 舞台はキー操作を使わないので、キー入力はすべてページ側に渡す
            WebGLInput.captureAllKeyboardInput = false;
#endif
            _lit = Resources.Load<Shader>("Shaders/TSLit") ?? Shader.Find("TS/Lit");
            _unlit = Resources.Load<Shader>("Shaders/TSUnlit") ?? Shader.Find("TS/Unlit");
            _add = Resources.Load<Shader>("Shaders/TSAdditive") ?? Shader.Find("TS/Additive");
            _radial = TexKit.Radial();
            _sparkleTex = TexKit.Sparkle();

            // 背景を透かすため、HDR・MSAA の中間バッファを使わず画面に直接描く（なめらかさはブラウザ側の antialias で出す）
            QualitySettings.antiAliasing = 0;
            _cam = new GameObject("Camera").AddComponent<Camera>();
            _cam.allowHDR = false;
            _cam.allowMSAA = false;
            _cam.transform.SetParent(transform, false);
            _cam.clearFlags = CameraClearFlags.SolidColor;
            _cam.backgroundColor = new Color(0, 0, 0, 0);
            _cam.nearClipPlane = 0.1f; _cam.farClipPlane = 60;

            // 背景写真（単体で見るとき用）
            _bgMat = new Material(_unlit);
            _bg = Plane("Background", _cam.transform, MeshKit.Quad(1, 1), _bgMat, new Vector3(0, 0, 50)).transform;
            _bg.gameObject.SetActive(!Transparent);

            _raysMat = new Material(_add) { mainTexture = Texture2D.whiteTexture };
            _rays = Plane("Rays", transform, MeshKit.Rays(22, 0.15f, 1f), _raysMat, new Vector3(0, 1.0f, 2.2f)).transform;
            _rays.localScale = Vector3.one * 5.2f;

            _haloMat = new Material(_add) { mainTexture = _radial };
            _halo = Plane("Halo", transform, MeshKit.Quad(1, 1), _haloMat, new Vector3(0, 1.0f, 1.6f)).transform;
            _halo.localScale = Vector3.one * 6f;

            var shadowMat = new Material(_unlit) { mainTexture = _radial, color = new Color(0, 0, 0, 0.5f) };
            _shadow = Plane("Shadow", transform, MeshKit.Quad(1, 1), shadowMat, new Vector3(0, 0.005f, 0)).transform;
            _shadow.localRotation = Quaternion.Euler(90, 0, 0);
            _shadow.localScale = new Vector3(ChestRig.W * 1.7f, ChestRig.D * 1.6f, 1);

            _chest = new ChestRig(transform, _lit, _add, TexKit.Wood(), _radial);

            _treasureMat = new Material(_unlit);
            _treasureHaloMat = new Material(_add) { mainTexture = _radial };
            _treasureHalo = Plane("TreasureHalo", transform, MeshKit.Quad(1, 1), _treasureHaloMat, Vector3.zero).transform;
            _treasure = Plane("Treasure", transform, MeshKit.Quad(1.55f, 1.55f), _treasureMat, Vector3.zero).transform;

            _burstMat = new Material(_add) { mainTexture = _radial, color = new Color(1, 0.9f, 0.6f, 0) };
            _burst = Plane("Burst", transform, MeshKit.Quad(1, 1), _burstMat, new Vector3(0, 1.3f, -0.4f)).transform;

            _dust = MakeParticles("Dust", true);
            _sparkBurst = MakeParticles("Spark", false);

            Apply(new StageCommand { scene = "chest", tod = "day", kind = "gem" });
        }

        GameObject Plane(string name, Transform parent, Mesh mesh, Material mat, Vector3 pos)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }

        ParticleSystem MakeParticles(string name, bool ambient)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            var ps = go.AddComponent<ParticleSystem>();
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            var main = ps.main;
            main.playOnAwake = false;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.maxParticles = ambient ? 60 : 160;
            var em = ps.emission;
            var shape = ps.shape;
            var col = ps.colorOverLifetime;
            col.enabled = true;
            var g = new Gradient();
            g.SetKeys(new[] { new GradientColorKey(Color.white, 0), new GradientColorKey(Color.white, 1) },
                      new[] { new GradientAlphaKey(0, 0), new GradientAlphaKey(1, 0.2f), new GradientAlphaKey(1, 0.6f), new GradientAlphaKey(0, 1) });
            col.color = g;
            var size = ps.sizeOverLifetime; size.enabled = true;
            size.size = new ParticleSystem.MinMaxCurve(1, AnimationCurve.EaseInOut(0, 0.6f, 1, 0.2f));
            if (ambient)
            {
                main.loop = true;
                main.startLifetime = new ParticleSystem.MinMaxCurve(2.5f, 4.5f);
                main.startSpeed = new ParticleSystem.MinMaxCurve(0.08f, 0.3f);
                main.startSize = new ParticleSystem.MinMaxCurve(0.06f, 0.18f);
                em.rateOverTime = 10;
                shape.shapeType = ParticleSystemShapeType.Box;
                shape.scale = new Vector3(6, 3.5f, 2);
                shape.position = new Vector3(0, 1.4f, 0);
                main.gravityModifier = -0.02f;
            }
            else
            {
                main.loop = false;
                main.startLifetime = new ParticleSystem.MinMaxCurve(0.9f, 1.8f);
                main.startSpeed = new ParticleSystem.MinMaxCurve(1.8f, 4.2f);
                main.startSize = new ParticleSystem.MinMaxCurve(0.1f, 0.32f);
                main.gravityModifier = 0.35f;
                em.rateOverTime = 0;
                shape.shapeType = ParticleSystemShapeType.Cone;
                shape.angle = 38;
                shape.radius = 0.6f;
                shape.rotation = new Vector3(-90, 0, 0);
                shape.position = new Vector3(0, ChestRig.H, 0);
            }
            var r = go.GetComponent<ParticleSystemRenderer>();
            r.sharedMaterial = new Material(_add) { mainTexture = _sparkleTex };
            r.renderMode = ParticleSystemRenderMode.Billboard;
            return ps;
        }

        // ---------------- 命令 ----------------

        public void Apply(StageCommand c)
        {
            switch (c.cmd)
            {
                case "tap": if (!_busy && !_opened) _wiggle = 0; return;
                case "wrong": if (!_busy && !_opened) _shake = 0; return;
                case "drag": _dragging = true; _dragVel = 0; _dragYaw = Mathf.Clamp(_dragYaw + c.dx * 0.35f, -55, 55); return;
                case "release": _dragging = false; return;
                case "unlock": if (!_busy && !_opened) StartCoroutine(Unlock()); return;
                case "sleep": _cam.enabled = false; Application.targetFrameRate = 5; return;
                case "wake": _cam.enabled = true; Application.targetFrameRate = -1; return;
            }
            // 場面の切り替え
            SetTod(string.IsNullOrEmpty(c.tod) ? _tod : c.tod);
            _kind = string.IsNullOrEmpty(c.kind) ? "gem" : c.kind;
            _scene = c.scene == "reveal" ? "reveal" : "chest";
            StopAllCoroutines();
            _busy = false; _dragYaw = 0; _wiggle = 1; _shake = 1;
            var tex = Resources.Load<Texture2D>("Treasures/" + _kind) ?? Resources.Load<Texture2D>("Treasures/gem");
            _treasureMat.mainTexture = tex;
            ResetLock();
            if (_scene == "chest")
            {
                _opened = false; _lidAngle = 0; _treasureRise = 0; _raysBoost = 0;
                _chest.SetGlow(0);
                _treasure.gameObject.SetActive(false);
                _treasureHalo.gameObject.SetActive(false);
            }
            else
            {
                _opened = true;
                _chest.Lock.gameObject.SetActive(false);
                if (c.fresh) StartCoroutine(Reveal());
                else { _lidAngle = 112; _treasureRise = 1; _raysBoost = 1; _chest.SetGlow(0.9f); ShowTreasure(true); }
            }
        }

        void ResetLock()
        {
            _chest.Lock.gameObject.SetActive(true);
            _chest.Lock.localPosition = new Vector3(0, ChestRig.H - 0.16f, -ChestRig.D / 2 - 0.07f);
            _chest.Lock.localRotation = Quaternion.identity;
            _chest.Shackle.localPosition = new Vector3(0, 0.16f, -0.02f);
        }

        void ShowTreasure(bool on)
        {
            _treasure.gameObject.SetActive(on);
            _treasureHalo.gameObject.SetActive(on);
        }

        void SetTod(string tod)
        {
            _tod = tod;
            _pal = StagePalette.For(tod);
            Shader.SetGlobalVector("_TS_LightDir", _pal.lightDir.normalized);
            Shader.SetGlobalColor("_TS_LightColor", _pal.light);
            Shader.SetGlobalColor("_TS_Sky", _pal.sky);
            Shader.SetGlobalColor("_TS_Ground", _pal.ground);
            Shader.SetGlobalColor("_TS_Rim", _pal.rim);
            _cam.backgroundColor = Transparent ? new Color(0, 0, 0, 0) : _pal.background;
            var bg = Resources.Load<Texture2D>("Backgrounds/" + tod);
            if (bg) _bgMat.mainTexture = bg;
            var main = _dust.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.95f, 0.75f, 0.9f), _pal.halo);
            var sm = _sparkBurst.main;
            sm.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.97f, 0.8f), new Color(1f, 0.78f, 0.35f));
            if (!_dust.isPlaying) _dust.Play();
        }

        // ---------------- 演出 ----------------

        IEnumerator Unlock()
        {
            _busy = true;
            var lockT = _chest.Lock;
            Vector3 l0 = lockT.localPosition;
            // 1) つるが外れる
            for (float t = 0; t < 1; t += Time.deltaTime / 0.45f)
            {
                _chest.Shackle.localPosition = new Vector3(0, 0.16f + 0.16f * Ease.OutBack(t), -0.02f);
                lockT.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(t * Mathf.PI * 3) * 8 * (1 - t));
                yield return null;
            }
            // 2) 錠前が落ちる
            for (float t = 0; t < 1; t += Time.deltaTime / 0.45f)
            {
                lockT.localPosition = l0 + new Vector3(0.15f * t, -1.1f * t * t, -0.35f * t);
                lockT.localRotation = Quaternion.Euler(-40 * t, 0, -70 * t);
                yield return null;
            }
            lockT.gameObject.SetActive(false);
            // 3) フタが開いて光があふれる
            _sparkBurst.Emit(90);
            for (float t = 0; t < 1; t += Time.deltaTime / 0.9f)
            {
                _lidAngle = 112 * Ease.OutBack(t, 1.2f);
                _chest.SetGlow(0.9f * Ease.OutCubic(t));
                _raysBoost = Ease.OutCubic(t);
                SetBurst(Ease.Pulse(t), 2 + t * 4);
                yield return null;
            }
            SetBurst(0, 1);
            _opened = true;
            _busy = false;
            Bridge.Notify("unlocked");
        }

        IEnumerator Reveal()
        {
            _busy = true;
            _lidAngle = 112; _raysBoost = 0.4f; _chest.SetGlow(0.9f);
            ShowTreasure(true);
            _treasureRise = 0;
            yield return new WaitForSeconds(0.15f);
            _sparkBurst.Emit(110);
            for (float t = 0; t < 1; t += Time.deltaTime / 1.3f)
            {
                _treasureRise = Ease.OutBack(t, 1.4f);
                _raysBoost = Mathf.Lerp(0.4f, 1, t);
                SetBurst(Ease.Pulse(Mathf.Clamp01(t * 1.6f)), 2.5f + t * 5);
                yield return null;
            }
            _treasureRise = 1;
            SetBurst(0, 1);
            _busy = false;
            Bridge.Notify("revealed");
        }

        void SetBurst(float a, float scale)
        {
            _burstMat.color = new Color(1, 0.92f, 0.65f, a * _pal.glow);
            _burst.localScale = Vector3.one * scale;
        }

        // ---------------- 毎フレーム ----------------

        void Update()
        {
            float t = Time.time;
            float dt = Time.deltaTime;
            FrameCamera();

            // 宝箱：ゆっくり浮き沈み＋指で回す（離すと正面へ戻る）
            if (!_dragging) _dragYaw = Mathf.SmoothDamp(_dragYaw, 0, ref _dragVel, 0.6f);
            _wiggle = Mathf.Min(1, _wiggle + dt / 0.7f);
            _shake = Mathf.Min(1, _shake + dt / 0.5f);
            float wig = Mathf.Sin(_wiggle * Mathf.PI * 6) * 7 * (1 - _wiggle);
            float bob = _opened ? 0 : Mathf.Sin(t * 1.6f) * 0.06f;
            _chest.Root.localPosition = new Vector3(0, 0.02f + bob + (1 - _wiggle) * 0.08f * Mathf.Abs(Mathf.Sin(_wiggle * Mathf.PI * 3)), 0);
            float sway = _opened ? 0 : Mathf.Sin(t * 0.45f) * 7;
            _chest.Root.localRotation = Quaternion.Euler(0, -16 + sway + _dragYaw, wig);
            if (_chest.Lock.gameObject.activeSelf && !_busy)
                _chest.Lock.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(_shake * Mathf.PI * 8) * 14 * (1 - _shake));
            _chest.Lid.localRotation = Quaternion.Euler(_lidAngle, 0, 0);
            _shadow.localScale = new Vector3(ChestRig.W * (1.7f - bob * 1.2f), ChestRig.D * 1.6f, 1);

            // 光の筋と後光
            _rays.localRotation = Quaternion.Euler(0, 0, t * 7);
            var rc = _pal.rays; rc.a *= 0.4f + 0.9f * _raysBoost;
            _raysMat.color = rc;
            var hc = _pal.halo; hc.a *= 0.35f + 0.5f * _raysBoost + 0.08f * Mathf.Sin(t * 2);
            _haloMat.color = hc;

            // お宝：箱の中からせり上がり、ふわふわ揺れる
            if (_treasure.gameObject.activeSelf)
            {
                float y = Mathf.LerpUnclamped(ChestRig.H - 0.3f, ChestRig.H + 1.25f, _treasureRise) + Mathf.Sin(t * 1.8f) * 0.08f * _treasureRise;
                var p = new Vector3(0, y, -0.1f);
                _treasure.localPosition = p;
                float s = Mathf.LerpUnclamped(0.35f, 1f, _treasureRise);
                _treasure.localScale = Vector3.one * s;
                _treasure.rotation = Quaternion.LookRotation(_treasure.position - _cam.transform.position) * Quaternion.Euler(0, Mathf.Sin(t * 0.9f) * 18, Mathf.Sin(t * 1.3f) * 4);
                _treasureMat.color = new Color(1, 1, 1, Mathf.Clamp01(_treasureRise * 2));
                _treasureHalo.localPosition = p + new Vector3(0, 0, 0.25f);
                _treasureHalo.rotation = Quaternion.LookRotation(_treasureHalo.position - _cam.transform.position);
                _treasureHalo.localScale = Vector3.one * (2.6f + Mathf.Sin(t * 2.2f) * 0.15f) * s;
                var th = _pal.halo; th.a = Mathf.Clamp01(th.a * 1.1f * _treasureRise);
                _treasureHaloMat.color = th;
            }
        }

        /// <summary>画面の縦横比に合わせて、宝箱（とお宝）が必ず収まるようにカメラを置く</summary>
        void FrameCamera()
        {
            float aspect = Mathf.Max(0.3f, _cam.aspect);
            bool reveal = _scene == "reveal";
            Vector3 look = reveal ? new Vector3(0, 1.45f, 0) : new Vector3(0, 0.9f, 0);
            float halfW = reveal ? 2.45f : 2.25f, halfH = reveal ? 2.15f : 1.4f;
            const float dist = 8f;
            float vNeed = Mathf.Atan(halfH / dist) * 2 * Mathf.Rad2Deg;
            float hNeed = Mathf.Atan(halfW / dist) * 2;
            float vFromH = Mathf.Atan(Mathf.Tan(hNeed / 2) / aspect) * 2 * Mathf.Rad2Deg;
            _cam.fieldOfView = Mathf.Clamp(Mathf.Max(vNeed, vFromH), 20, 70);
            var dir = Quaternion.Euler(14, 0, 0) * Vector3.back;
            _cam.transform.position = look + dir * dist;
            _cam.transform.LookAt(look);
            if (_bg.gameObject.activeSelf)
            {
                float h = 2 * 50 * Mathf.Tan(_cam.fieldOfView * 0.5f * Mathf.Deg2Rad);
                _bg.localScale = new Vector3(h * aspect, h, 1);
                var tex = _bgMat.mainTexture;
                if (tex)
                {
                    float ta = (float)tex.width / tex.height;
                    var scale = ta > aspect ? new Vector2(aspect / ta, 1) : new Vector2(1, ta / aspect);
                    _bgMat.mainTextureScale = scale;
                    _bgMat.mainTextureOffset = new Vector2((1 - scale.x) / 2, (1 - scale.y) / 2);
                }
            }
        }
    }
}
