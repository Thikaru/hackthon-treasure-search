using UnityEngine;

namespace TreasureStage
{
    /// <summary>
    /// 鍵のかかった宝箱。木の箱＋金の帯＋かまぼこ形のフタ＋貝殻の錠前。
    /// 原点は箱の底の中心。Lid（フタの蝶番）と Lock（錠前）を外から動かす。
    /// </summary>
    public class ChestRig
    {
        public const float W = 2.2f, H = 1.05f, D = 1.3f;
        const float LidArch = 0.72f;

        public Transform Root, Body, Lid, Lock, Shackle, Inside;
        public Renderer InnerGlow;
        readonly Material _wood, _woodLid, _woodInner, _gold, _goldDark, _pearl, _dark, _glow;

        public ChestRig(Transform parent, Shader lit, Shader additive, Texture2D wood, Texture2D radial)
        {
            _wood = Mat(lit, new Color(1f, 0.92f, 0.85f), wood, 0, 10, 0.12f);
            _woodLid = Mat(lit, new Color(1.08f, 1f, 0.92f), wood, 0, 10, 0.15f);
            _woodInner = Mat(lit, new Color(0.42f, 0.3f, 0.24f), wood, 0, 4, 0.02f);
            _gold = Mat(lit, new Color(0.95f, 0.7f, 0.28f), null, 1, 40, 1.0f);
            _gold.SetColor("_Emission", new Color(0.09f, 0.055f, 0.0f));
            _goldDark = Mat(lit, new Color(0.62f, 0.42f, 0.14f), null, 1, 28, 0.7f);
            _pearl = Mat(lit, new Color(1f, 0.9f, 0.86f), null, 0.3f, 64, 0.9f);
            _dark = Mat(lit, new Color(0.16f, 0.09f, 0.04f), null, 0, 8, 0.1f);
            _glow = new Material(additive) { mainTexture = radial, color = new Color(1f, 0.86f, 0.45f, 0f) };

            Root = new GameObject("Chest").transform;
            Root.SetParent(parent, false);
            Body = Child("Body", Root);

            // 箱
            Part("Box", Body, MeshKit.Box(new Vector3(W, H, D)), _wood, new Vector3(0, H / 2, 0));
            Part("Bottom", Body, MeshKit.Box(new Vector3(W + 0.06f, 0.1f, D + 0.06f)), _gold, new Vector3(0, 0.05f, 0));
            Frame("Rim", Body, H - 0.03f, 0.09f, 0.1f, _gold);
            // 箱の内側（フタを開けると見える）は暗い木で、奥行きがあるように見せる
            Part("InnerFloor", Body, MeshKit.Box(new Vector3(W - 0.14f, 0.02f, D - 0.14f)), _woodInner, new Vector3(0, H + 0.002f, 0));
            foreach (float x in new[] { -0.68f, 0.68f })
            {
                Part("Band", Body, MeshKit.Box(new Vector3(0.24f, H, D + 0.05f)), _gold, new Vector3(x, H / 2, 0));
                for (int k = 0; k < 4; k++)
                    Part("Rivet", Body, MeshKit.Box(new Vector3(0.06f, 0.06f, 0.04f)), _goldDark, new Vector3(x, 0.2f + k * 0.22f, -D / 2 - 0.035f));
            }
            foreach (float x in new[] { -W / 2, W / 2 })
                Part("Corner", Body, MeshKit.Box(new Vector3(0.1f, H, 0.1f)), _goldDark, new Vector3(x, H / 2, -D / 2));

            // 中身（フタが開くと見える）：光る面と金貨
            Inside = Child("Inside", Body);
            Inside.localPosition = new Vector3(0, H + 0.012f, 0);
            var glowGo = Part("InnerGlow", Inside, MeshKit.Quad(W * 1.25f, D * 1.35f), _glow, Vector3.zero);
            glowGo.transform.localRotation = Quaternion.Euler(90, 0, 0);
            InnerGlow = glowGo.GetComponent<Renderer>();
            var rnd = new System.Random(7);
            for (int i = 0; i < 22; i++)
            {
                float x = (float)(rnd.NextDouble() * 2 - 1) * (W / 2 - 0.25f);
                float z = (float)(rnd.NextDouble() * 2 - 1) * (D / 2 - 0.25f);
                float y = 0.02f + (float)rnd.NextDouble() * 0.08f * (1 - Mathf.Abs(x) / W);
                var coin = Part("Coin", Inside, MeshKit.Box(new Vector3(0.2f, 0.035f, 0.2f)), _gold, new Vector3(x, y, z));
                coin.transform.localRotation = Quaternion.Euler((float)rnd.NextDouble() * 30 - 15, (float)rnd.NextDouble() * 90, (float)rnd.NextDouble() * 30 - 15);
            }

            // フタ（蝶番は奥の上辺）
            Lid = Child("LidHinge", Root);
            Lid.localPosition = new Vector3(0, H, D / 2);
            var lidBody = Child("Lid", Lid);
            lidBody.localPosition = new Vector3(0, 0, -D / 2);
            Part("Vault", lidBody, MeshKit.Vault(W, D / 2, LidArch), _woodLid, Vector3.zero);
            foreach (float x in new[] { -0.68f, 0.68f })
                Part("LidBand", lidBody, MeshKit.Vault(0.24f, D / 2 + 0.03f, (D / 2 * LidArch + 0.03f) / (D / 2 + 0.03f)), _gold, new Vector3(x, 0, 0));
            Frame("LidEdge", lidBody, 0.03f, 0.08f, 0.1f, _gold);
            Part("LidInner", lidBody, MeshKit.Box(new Vector3(W - 0.1f, 0.02f, D - 0.1f)), _woodInner, new Vector3(0, -0.005f, 0));
            Part("LidEdgeL", lidBody, MeshKit.Vault(0.06f, D / 2 + 0.02f, LidArch), _goldDark, new Vector3(-W / 2 - 0.01f, 0, 0));
            Part("LidEdgeR", lidBody, MeshKit.Vault(0.06f, D / 2 + 0.02f, LidArch), _goldDark, new Vector3(W / 2 + 0.01f, 0, 0));

            // 貝殻の錠前（箱の正面、フタとの境目）
            Lock = Child("Lock", Root);
            Lock.localPosition = new Vector3(0, H - 0.16f, -D / 2 - 0.07f);
            var plate = Part("Plate", Lock, ShellPlate(), _gold, Vector3.zero);
            plate.transform.localScale = new Vector3(0.42f, 0.42f, 0.42f);
            var pearl = Part("Pearl", Lock, MeshKit.Box(new Vector3(0.13f, 0.13f, 0.05f)), _pearl, new Vector3(0, -0.02f, -0.07f));
            pearl.transform.localRotation = Quaternion.Euler(0, 0, 45);
            Part("Keyhole", Lock, MeshKit.Box(new Vector3(0.035f, 0.08f, 0.02f)), _dark, new Vector3(0, -0.16f, -0.085f));
            Shackle = Child("Shackle", Lock);
            Shackle.localPosition = new Vector3(0, 0.16f, -0.02f);
            Part("Arc", Shackle, MeshKit.HalfTorus(0.12f, 0.035f), _gold, Vector3.zero);
            Part("LegL", Shackle, MeshKit.Box(new Vector3(0.07f, 0.12f, 0.07f)), _gold, new Vector3(-0.12f, -0.05f, 0));
            Part("LegR", Shackle, MeshKit.Box(new Vector3(0.07f, 0.12f, 0.07f)), _gold, new Vector3(0.12f, -0.05f, 0));
        }

        /// <summary>扇形にふくらんだ貝殻の板（筋つき）。原点が扇の要</summary>
        static Mesh ShellPlate()
        {
            const int seg = 28;
            var v = new System.Collections.Generic.List<Vector3>();
            var n = new System.Collections.Generic.List<Vector3>();
            var tri = new System.Collections.Generic.List<int>();
            const float a0 = Mathf.PI * 0.1f, a1 = Mathf.PI * 0.9f;
            // 前面：要(下)から上に広がる。筋の分だけ前後に波打たせる
            v.Add(new Vector3(0, -0.55f, -0.08f)); n.Add(Vector3.back);
            for (int i = 0; i <= seg; i++)
            {
                float a = Mathf.Lerp(a0, a1, (float)i / seg);
                float rib = Mathf.Abs(Mathf.Sin(i * Mathf.PI / 4f));
                float r = 0.95f + rib * 0.06f;
                var p = new Vector3(Mathf.Cos(a) * r, Mathf.Sin(a) * r * 0.85f - 0.55f + 0.2f, -0.12f - rib * 0.05f);
                v.Add(p);
                n.Add(new Vector3(Mathf.Cos(a) * 0.5f, Mathf.Sin(a) * 0.3f, -1).normalized);
            }
            for (int i = 0; i < seg; i++) tri.AddRange(new[] { 0, 2 + i, 1 + i });
            // 縁（前面から背面へ）
            int back = v.Count;
            for (int i = 0; i <= seg; i++)
            {
                var p = v[1 + i];
                v.Add(new Vector3(p.x, p.y, 0.05f));
                float a = Mathf.Lerp(a0, a1, (float)i / seg);
                n.Add(new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0));
            }
            int edgeFront = v.Count;
            for (int i = 0; i <= seg; i++) { v.Add(v[1 + i]); n.Add(n[back + i]); }
            for (int i = 0; i < seg; i++)
            {
                int f = edgeFront + i, b = back + i;
                tri.AddRange(new[] { f, b + 1, b, f, f + 1, b + 1 });
            }
            var m = new Mesh();
            m.SetVertices(v); m.SetNormals(n); m.SetTriangles(tri, 0);
            m.SetUVs(0, new Vector2[v.Count]);
            m.RecalculateBounds();
            return m;
        }

        /// <summary>箱の縁どり（中央を空けた4本の棒）。大きな金属の板にすると光を鏡のように返して白く飛ぶため</summary>
        void Frame(string name, Transform parent, float y, float height, float bar, Material mat)
        {
            float w = W + 0.06f, d = D + 0.06f;
            Part(name + "F", parent, MeshKit.Box(new Vector3(w, height, bar)), mat, new Vector3(0, y, -d / 2 + bar / 2));
            Part(name + "B", parent, MeshKit.Box(new Vector3(w, height, bar)), mat, new Vector3(0, y, d / 2 - bar / 2));
            Part(name + "L", parent, MeshKit.Box(new Vector3(bar, height, d)), mat, new Vector3(-w / 2 + bar / 2, y, 0));
            Part(name + "R", parent, MeshKit.Box(new Vector3(bar, height, d)), mat, new Vector3(w / 2 - bar / 2, y, 0));
        }

        public void SetGlow(float a)
        {
            var c = _glow.color; c.a = a; _glow.color = c;
        }

        static Material Mat(Shader s, Color c, Texture2D tex, float metal, float gloss, float spec)
        {
            var m = new Material(s) { color = c };
            if (tex) m.mainTexture = tex;
            m.SetFloat("_Metal", metal); m.SetFloat("_Gloss", gloss); m.SetFloat("_Spec", spec);
            return m;
        }

        static Transform Child(string name, Transform parent)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            return t;
        }

        static GameObject Part(string name, Transform parent, Mesh mesh, Material mat, Vector3 pos)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = pos;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            return go;
        }
    }
}
