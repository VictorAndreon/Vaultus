/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './resources/js/**/*.{tsx,ts}',
        './resources/views/**/*.blade.php',
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50:  '#eef2ff',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                },
            },
        },
    },
    plugins: [],
}
