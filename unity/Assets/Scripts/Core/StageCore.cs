using System;
using UnityEngine;

namespace TreasureStage
{
    /// <summary>
    /// Web（React）から SendMessage("Bridge", "Command", json) で届く命令。
    /// cmd: scene（場面の切り替え）/ tap / wrong / unlock / drag / sleep / wake
    /// </summary>
    [Serializable]
    public class StageCommand
    {
        public string cmd = "";
        /// <summary>chest（鍵のかかった宝箱）/ reveal（お宝獲得）</summary>
        public string scene = "chest";
        /// <summary>day / dusk / night</summary>
        public string tod = "day";
        /// <summary>お宝の絵（Resources/Treasures の名前）。compass, key, stone, bottle, scale, map, marble, bell, gem</summary>
        public string kind = "gem";
        /// <summary>reveal を演出つきで出すか（獲得直後だけ true）</summary>
        public bool fresh;
        public float dx;

        public static StageCommand Parse(string json)
        {
            if (string.IsNullOrEmpty(json)) return new StageCommand();
            try { return JsonUtility.FromJson<StageCommand>(json) ?? new StageCommand(); }
            catch (ArgumentException) { return new StageCommand(); }
        }
    }

    public static class Ease
    {
        public static float OutCubic(float t) { t = Mathf.Clamp01(t); return 1 - Mathf.Pow(1 - t, 3); }
        public static float InOutSine(float t) { t = Mathf.Clamp01(t); return -(Mathf.Cos(Mathf.PI * t) - 1) / 2; }
        public static float OutBack(float t, float s = 1.70158f)
        {
            t = Mathf.Clamp01(t) - 1;
            return t * t * ((s + 1) * t + s) + 1;
        }
        /// <summary>0→1→0 の山（光の瞬きなど）</summary>
        public static float Pulse(float t) { t = Mathf.Clamp01(t); return Mathf.Sin(t * Mathf.PI); }
    }

    /// <summary>時間帯ごとの光と色。Web 版の配色（昼＝コバルト、夕方＝茜と金、夜＝金の灯り）に合わせる</summary>
    public struct StagePalette
    {
        public Vector3 lightDir;
        public Color light, sky, ground, rim, rays, halo, background;
        public float glow;

        public static readonly string[] Names = { "day", "dusk", "night" };

        public static StagePalette For(string tod)
        {
            switch (tod)
            {
                case "dusk":
                    return new StagePalette
                    {
                        lightDir = new Vector3(-0.55f, 0.5f, -0.45f),
                        light = new Color(1.25f, 0.78f, 0.45f),
                        sky = new Color(0.62f, 0.46f, 0.5f),
                        ground = new Color(0.42f, 0.24f, 0.18f),
                        rim = new Color(1f, 0.62f, 0.3f, 0.75f),
                        rays = new Color(1f, 0.72f, 0.38f, 0.32f),
                        halo = new Color(1f, 0.7f, 0.35f, 0.75f),
                        background = new Color(0.36f, 0.2f, 0.14f),
                        glow = 1.1f,
                    };
                case "night":
                    return new StagePalette
                    {
                        lightDir = new Vector3(0.35f, 0.7f, -0.45f),
                        light = new Color(1.0f, 0.9f, 0.78f),
                        sky = new Color(0.34f, 0.38f, 0.64f),
                        ground = new Color(0.2f, 0.14f, 0.12f),
                        rim = new Color(1f, 0.82f, 0.45f, 0.8f),
                        rays = new Color(1f, 0.84f, 0.45f, 0.3f),
                        halo = new Color(1f, 0.82f, 0.42f, 0.85f),
                        background = new Color(0.04f, 0.08f, 0.18f),
                        glow = 1.35f,
                    };
                default:
                    return new StagePalette
                    {
                        lightDir = new Vector3(0.45f, 0.8f, -0.5f),
                        light = new Color(1.12f, 1.06f, 0.96f),
                        sky = new Color(0.66f, 0.78f, 0.98f),
                        ground = new Color(0.72f, 0.58f, 0.42f),
                        rim = new Color(1f, 1f, 1f, 0.35f),
                        rays = new Color(1f, 0.93f, 0.7f, 0.26f),
                        halo = new Color(1f, 0.92f, 0.65f, 0.6f),
                        background = new Color(0.58f, 0.7f, 0.86f),
                        glow = 0.9f,
                    };
            }
        }
    }
}
