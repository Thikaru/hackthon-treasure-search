using System.Collections.Generic;
using UnityEngine;

namespace TreasureStage
{
    /// <summary>宝箱を組み立てるための形をコードで作る（モデルファイルを持たないため）</summary>
    public static class MeshKit
    {
        /// <summary>中心が原点の直方体。UV は各面 0-1</summary>
        public static Mesh Box(Vector3 size)
        {
            var h = size * 0.5f;
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var tri = new List<int>();
            void Face(Vector3 normal, Vector3 u, Vector3 w, float du, float dw)
            {
                int i = v.Count;
                Vector3 c = Vector3.Scale(normal, h);
                v.Add(c - u * du - w * dw); v.Add(c + u * du - w * dw); v.Add(c + u * du + w * dw); v.Add(c - u * du + w * dw);
                for (int k = 0; k < 4; k++) n.Add(normal);
                uv.Add(new Vector2(0, 0)); uv.Add(new Vector2(1, 0)); uv.Add(new Vector2(1, 1)); uv.Add(new Vector2(0, 1));
                tri.AddRange(new[] { i, i + 2, i + 1, i, i + 3, i + 2 });
            }
            Face(Vector3.back, Vector3.right, Vector3.up, h.x, h.y);
            Face(Vector3.forward, Vector3.left, Vector3.up, h.x, h.y);
            Face(Vector3.left, Vector3.back, Vector3.up, h.z, h.y);
            Face(Vector3.right, Vector3.forward, Vector3.up, h.z, h.y);
            Face(Vector3.up, Vector3.right, Vector3.forward, h.x, h.z);
            Face(Vector3.down, Vector3.right, Vector3.back, h.x, h.z);
            return Build(v, n, uv, tri);
        }

        /// <summary>
        /// 宝箱のフタ：X 方向に伸びた「かまぼこ形」。底面が y=0、奥行き z は -radius..radius。
        /// heightScale でアーチの高さをつぶせる。
        /// </summary>
        public static Mesh Vault(float length, float radius, float heightScale, int seg = 24)
        {
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var tri = new List<int>();
            float hx = length * 0.5f;
            // 曲面
            for (int i = 0; i <= seg; i++)
            {
                float a = Mathf.PI * i / seg; // 0 = 奥(z+)、PI = 手前(z-)
                float z = Mathf.Cos(a) * radius, y = Mathf.Sin(a) * radius * heightScale;
                var nn = new Vector3(0, Mathf.Sin(a) / heightScale, Mathf.Cos(a)).normalized;
                v.Add(new Vector3(-hx, y, z)); n.Add(nn); uv.Add(new Vector2(0, (float)i / seg));
                v.Add(new Vector3(hx, y, z)); n.Add(nn); uv.Add(new Vector2(1, (float)i / seg));
            }
            for (int i = 0; i < seg; i++)
            {
                int a = i * 2;
                tri.AddRange(new[] { a, a + 1, a + 3, a, a + 3, a + 2 });
            }
            // 両端のふた
            foreach (float side in new[] { -1f, 1f })
            {
                int c = v.Count;
                v.Add(new Vector3(side * hx, 0, 0)); n.Add(new Vector3(side, 0, 0)); uv.Add(new Vector2(0.5f, 0));
                for (int i = 0; i <= seg; i++)
                {
                    float a = Mathf.PI * i / seg;
                    v.Add(new Vector3(side * hx, Mathf.Sin(a) * radius * heightScale, Mathf.Cos(a) * radius));
                    n.Add(new Vector3(side, 0, 0)); uv.Add(new Vector2(0.5f + Mathf.Cos(a) * 0.5f, Mathf.Sin(a)));
                }
                for (int i = 0; i < seg; i++)
                {
                    if (side > 0) tri.AddRange(new[] { c, c + 2 + i, c + 1 + i });
                    else tri.AddRange(new[] { c, c + 1 + i, c + 2 + i });
                }
            }
            // 底面
            int b = v.Count;
            v.Add(new Vector3(-hx, 0, -radius)); v.Add(new Vector3(hx, 0, -radius)); v.Add(new Vector3(hx, 0, radius)); v.Add(new Vector3(-hx, 0, radius));
            for (int k = 0; k < 4; k++) { n.Add(Vector3.down); uv.Add(Vector2.zero); }
            tri.AddRange(new[] { b, b + 1, b + 2, b, b + 2, b + 3 });
            return Build(v, n, uv, tri);
        }

        /// <summary>半円のトーラス（錠前のつる）。XY 平面、上向きのアーチ</summary>
        public static Mesh HalfTorus(float radius, float tube, int seg = 18, int ring = 10)
        {
            var v = new List<Vector3>(); var n = new List<Vector3>(); var uv = new List<Vector2>(); var tri = new List<int>();
            for (int i = 0; i <= seg; i++)
            {
                float a = Mathf.PI * i / seg;
                var c = new Vector3(Mathf.Cos(a) * radius, Mathf.Sin(a) * radius, 0);
                var outDir = c.normalized;
                for (int j = 0; j <= ring; j++)
                {
                    float b = Mathf.PI * 2 * j / ring;
                    var nn = outDir * Mathf.Cos(b) + Vector3.forward * Mathf.Sin(b);
                    v.Add(c + nn * tube); n.Add(nn); uv.Add(new Vector2((float)i / seg, (float)j / ring));
                }
            }
            int stride = ring + 1;
            for (int i = 0; i < seg; i++)
                for (int j = 0; j < ring; j++)
                {
                    int a = i * stride + j, c2 = a + stride;
                    tri.AddRange(new[] { a, c2, a + 1, a + 1, c2, c2 + 1 });
                }
            return Build(v, n, uv, tri);
        }

        /// <summary>中心から放射状にのびる光の筋（加算表示用）。頂点色の a で筋の濃淡を作る</summary>
        public static Mesh Rays(int count, float inner, float outer)
        {
            var v = new List<Vector3>(); var c = new List<Color>(); var uv = new List<Vector2>(); var tri = new List<int>();
            float step = Mathf.PI * 2 / count;
            for (int i = 0; i < count; i++)
            {
                float a0 = i * step, a1 = a0 + step * 0.42f;
                int k = v.Count;
                v.Add(new Vector3(Mathf.Cos(a0), Mathf.Sin(a0)) * inner);
                v.Add(new Vector3(Mathf.Cos(a1), Mathf.Sin(a1)) * inner);
                v.Add(new Vector3(Mathf.Cos(a1), Mathf.Sin(a1)) * outer);
                v.Add(new Vector3(Mathf.Cos(a0), Mathf.Sin(a0)) * outer);
                float s = (i % 3 == 0) ? 1f : 0.6f;
                c.Add(new Color(1, 1, 1, s)); c.Add(new Color(1, 1, 1, s)); c.Add(new Color(1, 1, 1, 0)); c.Add(new Color(1, 1, 1, 0));
                for (int q = 0; q < 4; q++) uv.Add(new Vector2(0.5f, 0.5f));
                tri.AddRange(new[] { k, k + 1, k + 2, k, k + 2, k + 3 });
            }
            var m = new Mesh { name = "Rays" };
            m.SetVertices(v); m.SetColors(c); m.SetUVs(0, uv); m.SetTriangles(tri, 0);
            m.RecalculateBounds();
            return m;
        }

        /// <summary>原点中心の XY 平面の四角（テクスチャを貼る板）</summary>
        public static Mesh Quad(float w, float h)
        {
            var m = new Mesh { name = "Quad" };
            m.vertices = new[] { new Vector3(-w / 2, -h / 2), new Vector3(w / 2, -h / 2), new Vector3(w / 2, h / 2), new Vector3(-w / 2, h / 2) };
            m.uv = new[] { new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1) };
            m.colors = new[] { Color.white, Color.white, Color.white, Color.white };
            m.normals = new[] { Vector3.back, Vector3.back, Vector3.back, Vector3.back };
            m.triangles = new[] { 0, 2, 1, 0, 3, 2 };
            m.RecalculateBounds();
            return m;
        }

        static Mesh Build(List<Vector3> v, List<Vector3> n, List<Vector2> uv, List<int> tri)
        {
            var m = new Mesh();
            m.SetVertices(v); m.SetNormals(n); m.SetUVs(0, uv); m.SetTriangles(tri, 0);
            m.RecalculateBounds();
            return m;
        }
    }

    /// <summary>木目・光のにじみ・きらめきの絵をコードで作る</summary>
    public static class TexKit
    {
        public static Texture2D Wood(int w = 256, int h = 256)
        {
            var t = new Texture2D(w, h, TextureFormat.RGBA32, true) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 2 };
            var px = new Color[w * h];
            var light = new Color(0.78f, 0.5f, 0.27f);
            var dark = new Color(0.45f, 0.25f, 0.11f);
            const int planks = 4;
            for (int y = 0; y < h; y++)
            {
                int plank = y * planks / h;
                float py = (y % (h / planks)) / (float)(h / planks);
                float tone = 0.9f + 0.12f * Mathf.PerlinNoise(plank * 3.1f, 0.5f);
                for (int x = 0; x < w; x++)
                {
                    float fx = x / (float)w;
                    float grain = Mathf.PerlinNoise(fx * 3f + plank * 7f, py * 18f + Mathf.Sin(fx * 9f + plank) * 0.6f);
                    float lines = Mathf.Abs(Mathf.Sin((py * 22f + grain * 5f) * Mathf.PI));
                    var c = Color.Lerp(dark, light, 0.35f + grain * 0.45f + lines * 0.2f) * tone;
                    // 板の継ぎ目
                    float seam = Mathf.Min(py, 1 - py);
                    if (seam < 0.05f) c *= Mathf.Lerp(0.45f, 1f, seam / 0.05f);
                    c.a = 1;
                    px[y * w + x] = c;
                }
            }
            t.SetPixels(px); t.Apply(true);
            return t;
        }

        /// <summary>中心ほど明るい円（後光・影）</summary>
        public static Texture2D Radial(int size = 128, float power = 1.6f)
        {
            var t = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color[size * size];
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float dx = (x + 0.5f) / size * 2 - 1, dy = (y + 0.5f) / size * 2 - 1;
                    float a = Mathf.Pow(Mathf.Clamp01(1 - Mathf.Sqrt(dx * dx + dy * dy)), power);
                    px[y * size + x] = new Color(1, 1, 1, a);
                }
            t.SetPixels(px); t.Apply();
            return t;
        }

        /// <summary>4方向に光がのびる星（きらめきの粒）</summary>
        public static Texture2D Sparkle(int size = 64)
        {
            var t = new Texture2D(size, size, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
            var px = new Color[size * size];
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float dx = Mathf.Abs((x + 0.5f) / size * 2 - 1), dy = Mathf.Abs((y + 0.5f) / size * 2 - 1);
                    float core = Mathf.Pow(Mathf.Clamp01(1 - Mathf.Sqrt(dx * dx + dy * dy) * 2.2f), 2);
                    float cross = Mathf.Clamp01(1 - dx * 8) * Mathf.Clamp01(1 - dy) + Mathf.Clamp01(1 - dy * 8) * Mathf.Clamp01(1 - dx);
                    px[y * size + x] = new Color(1, 1, 1, Mathf.Clamp01(core + cross * 0.7f));
                }
            t.SetPixels(px); t.Apply();
            return t;
        }
    }
}
