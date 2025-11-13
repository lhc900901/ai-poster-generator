// functions/api/generate-poster.js

// Cloudflare Pages Function의 진입점
export async function onRequest(context) {
    const { request, env } = context;

    // POST 요청만 허용
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    // 환경 변수에서 API 키를 안전하게 로드합니다.
    const API_KEY = env.GEMINI_API_KEY; 
    
    if (!API_KEY) {
        return new Response('API Key not configured.', { status: 500 });
    }

    try {
        const { keyword } = await request.json();
        if (!keyword) {
            return new Response(JSON.stringify({ error: "Missing keyword" }), { status: 400 });
        }
        
        // --- 1단계: 프롬프트 확장 (Gemini Pro) ---
        const systemPrompt = `You are a world-class image prompt engineer. Based on the user's concept keyword, create a detailed, high-resolution, cinematic K-Drama Poster style prompt over 100 words long for image generation. Only include the prompt text in your output.`;

        const geminiRequest = {
            contents: [{ role: "user", parts: [{ text: keyword }] }],
            config: { systemInstruction: systemPrompt }
        };

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}` , {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiRequest),
        });

        const geminiResult = await geminiResponse.json();
        const expandedPrompt = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text.trim();
        
        if (!expandedPrompt) {
            return new Response(JSON.stringify({ error: "Failed to generate expanded prompt." }), { status: 500 });
        }
        
        // --- 2단계: 이미지 생성 (Imagen) ---
        const imagenRequest = {
            model: "imagen-3.0-generate-002",
            prompt: expandedPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: "image/jpeg",
                aspectRatio: "16:9" 
            }
        };
        
        // Imagen API 호출
        const imagenResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${API_KEY}` , {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imagenRequest),
        });
        
        const imagenResult = await imagenResponse.json();
        
        // 이미지 데이터(Base64) 추출
        const imageBase64 = imagenResult.generatedImages?.[0]?.image?.imageBytes; 

        if (!imageBase64) {
             return new Response(JSON.stringify({ error: "Failed to generate image.", details: imagenResult }), { status: 500 });
        }

        // 최종 결과 반환
        return new Response(JSON.stringify({ 
            status: 'success', 
            image_data: imageBase64,
        }), { 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Worker execution error:", error);
        return new Response(JSON.stringify({ error: `Internal Server Error: ${error.message}` }), { status: 500 });
    }
}