using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace TreasureStage.EditorTools
{
    /// <summary>
    /// シーンをコードから作り、プレイヤー設定を整える（シーン・プレハブは手編集しない）。
    ///   Unity -batchmode -quit -projectPath unity -executeMethod TreasureStage.EditorTools.ProjectSetup.Setup
    /// </summary>
    public static class ProjectSetup
    {
        const string ScenePath = "Assets/Scenes/Stage.unity";

        [MenuItem("TreasureStage/Setup Project")]
        public static void Setup()
        {
            ImportSettings();
            CreateScene();
            ApplyPlayerSettings();
            AssetDatabase.SaveAssets();
            Debug.Log("[TreasureStage] setup complete");
        }

        public static void CreateScene()
        {
            Directory.CreateDirectory("Assets/Scenes");
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            // React から SendMessage("Bridge", ...) で呼ぶので、名前は Bridge 固定
            var go = new GameObject("Bridge");
            go.AddComponent<Stage>();
            go.AddComponent<Bridge>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        /// <summary>お宝の絵と背景写真：圧縮しすぎず、ミップマップなしで軽く</summary>
        static void ImportSettings()
        {
            foreach (var dir in new[] { "Assets/Resources/Treasures", "Assets/Resources/Backgrounds" })
            {
                foreach (var guid in AssetDatabase.FindAssets("t:Texture2D", new[] { dir }))
                {
                    var path = AssetDatabase.GUIDToAssetPath(guid);
                    if (AssetImporter.GetAtPath(path) is not TextureImporter ti) continue;
                    ti.textureType = TextureImporterType.Default;
                    ti.mipmapEnabled = false;
                    ti.alphaIsTransparency = dir.EndsWith("Treasures");
                    ti.wrapMode = TextureWrapMode.Clamp;
                    ti.maxTextureSize = 512;
                    ti.textureCompression = TextureImporterCompression.CompressedHQ;
                    ti.SaveAndReimport();
                }
            }
        }

        public static void ApplyPlayerSettings()
        {
            PlayerSettings.companyName = "aipapagames";
            PlayerSettings.productName = "TreasureStage";
            PlayerSettings.bundleVersion = "0.1.0";
            PlayerSettings.SplashScreen.show = false;
            PlayerSettings.SplashScreen.showUnityLogo = false;
            PlayerSettings.colorSpace = ColorSpace.Gamma;
            PlayerSettings.runInBackground = true;

            PlayerSettings.WebGL.template = "PROJECT:Stage";
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
            PlayerSettings.WebGL.memoryGrowthMode = WebGLMemoryGrowthMode.Geometric;
            PlayerSettings.WebGL.initialMemorySize = 32;
            PlayerSettings.WebGL.maximumMemorySize = 256;
            PlayerSettings.SetManagedStrippingLevel(UnityEditor.Build.NamedBuildTarget.WebGL, ManagedStrippingLevel.High);
            PlayerSettings.stripEngineCode = true;
            QualitySettings.antiAliasing = 0;
        }
    }
}
