// 宝箱・お宝用のライティング。Unity のライトに頼らず、時間帯ごとの光をグローバル値で受け取る
// （昼・夕方・夜で同じ見た目の基準を保つため。値は StagePalette が設定する）
Shader "TS/Lit"
{
    Properties
    {
        _Color ("Color", Color) = (1,1,1,1)
        _MainTex ("Texture", 2D) = "white" {}
        _Metal ("Metal (0-1)", Range(0,1)) = 0
        _Gloss ("Gloss", Range(1,128)) = 24
        _Spec ("Specular", Range(0,2)) = 0.3
        _Emission ("Emission", Color) = (0,0,0,0)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            sampler2D _MainTex; float4 _MainTex_ST;
            fixed4 _Color; half _Metal; half _Gloss; half _Spec; fixed4 _Emission;
            float4 _TS_LightDir; fixed4 _TS_LightColor; fixed4 _TS_Sky; fixed4 _TS_Ground; fixed4 _TS_Rim;

            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; float3 n : TEXCOORD1; float3 wp : TEXCOORD2; };

            v2f vert (appdata_base v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.texcoord, _MainTex);
                o.n = UnityObjectToWorldNormal(v.normal);
                o.wp = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float3 n = normalize(i.n);
                float3 l = normalize(_TS_LightDir.xyz);
                float3 v = normalize(_WorldSpaceCameraPos - i.wp);
                fixed3 baseCol = tex2D(_MainTex, i.uv).rgb * _Color.rgb;

                half ndl = dot(n, l);
                half diff = saturate(ndl * 0.65 + 0.35);
                fixed3 amb = lerp(_TS_Ground.rgb, _TS_Sky.rgb, n.y * 0.5 + 0.5);
                half spec = pow(saturate(dot(n, normalize(l + v))), _Gloss) * _Spec;

                // 金属は「空と地面の色を映す」だけの簡易反射で、ぎらつきを出す
                float3 r = reflect(-v, n);
                fixed3 env = lerp(_TS_Ground.rgb * 0.6, _TS_Sky.rgb * 1.15, smoothstep(-0.2, 0.7, r.y));
                fixed3 dielectric = baseCol * (amb * 0.5 + _TS_LightColor.rgb * diff * 0.72);
                fixed3 metal = baseCol * (amb * 0.2 + _TS_LightColor.rgb * diff * 0.5) + baseCol * env * 0.42;
                fixed3 col = lerp(dielectric, metal, _Metal);
                col += _TS_LightColor.rgb * spec * lerp(0.5, 1.3, _Metal);

                half fres = pow(1 - saturate(dot(n, v)), 3);
                col += _TS_Rim.rgb * fres * _TS_Rim.a;
                col += _Emission.rgb;
                return fixed4(col, 1);
            }
            ENDCG
        }
    }
}
