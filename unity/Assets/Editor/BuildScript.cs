using System;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace TreasureStage.EditorTools
{
    /// <summary>
    ///   Unity -batchmode -quit -projectPath unity -executeMethod TreasureStage.EditorTools.BuildScript.WebGL
    /// 出力は unity/Build/WebGL。Web 版へは npm run unity:copy で public/unity/ にコピーする。
    /// </summary>
    public static class BuildScript
    {
        [MenuItem("TreasureStage/Build WebGL")]
        public static void WebGL()
        {
            ProjectSetup.Setup();
            if (EditorUserBuildSettings.activeBuildTarget != BuildTarget.WebGL)
                EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.WebGL, BuildTarget.WebGL);
            // Cloudflare Pages / GitHub Pages のどちらでも動くよう、Brotli＋JS 側での展開にする
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.decompressionFallback = true;
            string dir = Path.Combine(Directory.GetCurrentDirectory(), "Build", "WebGL");
            if (Directory.Exists(dir)) Directory.Delete(dir, true);
            Directory.CreateDirectory(dir);
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { "Assets/Scenes/Stage.unity" },
                target = BuildTarget.WebGL,
                locationPathName = dir,
                options = BuildOptions.None,
            });
            var s = report.summary;
            Debug.Log($"[TreasureStage] Build {s.platform} -> {s.result} ({s.totalSize} bytes)");
            if (s.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                if (Application.isBatchMode) EditorApplication.Exit(1);
                throw new Exception("Build failed: " + s.result);
            }
        }
    }
}
