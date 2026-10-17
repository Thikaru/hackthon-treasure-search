using System.Collections;
using System.Runtime.InteropServices;
using UnityEngine;

namespace TreasureStage
{
    /// <summary>
    /// Web（React）との窓口。React → SendMessage("Bridge", "Command", json)、
    /// Unity → window.TreasureStageNotify(message)（"ready" / "unlocked" / "revealed"）。
    /// 単体で開いたときは URL の ?demo=chest|unlock|reveal&amp;tod=day|dusk|night&amp;kind=compass&amp;bg=1 で動作確認できる。
    /// </summary>
    public class Bridge : MonoBehaviour
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void TS_Notify(string message);
#else
        static void TS_Notify(string message) { Debug.Log("[TreasureStage] notify " + message); }
#endif

        Stage _stage;

        public static void Notify(string message) => TS_Notify(message);

        void Awake()
        {
            _stage = GetComponent<Stage>();
            var q = ParseQuery(Application.absoluteURL);
            if (q.TryGetValue("bg", out var bg) && bg == "1") _stage.Transparent = false;
        }

        IEnumerator Start()
        {
            yield return null;
            var q = ParseQuery(Application.absoluteURL);
            if (q.TryGetValue("demo", out var demo))
            {
                q.TryGetValue("tod", out var tod);
                q.TryGetValue("kind", out var kind);
                var c = new StageCommand { scene = demo == "reveal" ? "reveal" : "chest", tod = tod ?? "day", kind = kind ?? "compass", fresh = true };
                _stage.Apply(c);
                if (demo == "unlock")
                {
                    yield return new WaitForSeconds(1.2f);
                    _stage.Apply(new StageCommand { cmd = "unlock" });
                }
            }
            Notify("ready");
        }

        /// <summary>React から呼ばれる</summary>
        public void Command(string json) => _stage.Apply(StageCommand.Parse(json));

        static System.Collections.Generic.Dictionary<string, string> ParseQuery(string url)
        {
            var d = new System.Collections.Generic.Dictionary<string, string>();
            if (string.IsNullOrEmpty(url)) return d;
            int i = url.IndexOf('?');
            if (i < 0) return d;
            string qs = url.Substring(i + 1);
            int h = qs.IndexOf('#');
            if (h >= 0) qs = qs.Substring(0, h);
            foreach (var part in qs.Split('&'))
            {
                var kv = part.Split('=');
                if (kv.Length == 2) d[kv[0]] = System.Uri.UnescapeDataString(kv[1]);
            }
            return d;
        }
    }
}
