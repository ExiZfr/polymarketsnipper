/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#09090b", // Zinc 950
                surface: "#18181b",    // Zinc 900
                surfaceHighlight: "#27272a", // Zinc 800
                primary: "#3b82f6",    // Blue 500
                primaryHover: "#2563eb", // Blue 600
                accent: "#8b5cf6",     // Violet 500
                text: "#f4f4f5",       // Zinc 100
                textMuted: "#a1a1aa",  // Zinc 400
                border: "#27272a",     // Zinc 800
                success: "#10b981",    // Emerald 500
                error: "#ef4444",      // Red 500
                warning: "#f59e0b",    // Amber 500
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #2a8af6 0deg, #a853ba 180deg, #e92a67 360deg)',
            },
        },
    },
    plugins: [],
}
