// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react-swc";
// import path from "path";
// import { componentTagger } from "lovable-tagger";

// // https://vitejs.dev/config/
// export default defineConfig(({ mode }) => ({
//   server: {
//     host: "::",
//     port: 8080,
//   },
//   plugins: [
//     react(),
//     mode === 'development' &&
//     componentTagger(),
//   ].filter(Boolean),
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
// }));


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Assuming lovable-tagger might not have types or is dev-only
// import { componentTagger } from "lovable-tagger";

// Define the type for the componentTagger function if necessary
// Example: declare function componentTagger(options?: any): Plugin;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Define base plugins
  const plugins = [react()];

  // Conditionally add development plugins
  if (mode === 'development') {
    try {
      // Dynamically import if it's truly optional or might not be installed
      // Or directly use if it's a devDependency
      // const { componentTagger } = await import('lovable-tagger');
      // plugins.push(componentTagger());
      console.log("Note: componentTagger plugin is conditionally configured for development mode.");
    } catch (error) {
      console.warn("lovable-tagger not found or failed to load, skipping.");
    }
  }

  return {
    server: {
      host: "::", // Your existing host setting
      port: 8080, // Your existing port setting

      // --- Proxy configuration for FastAPI Backend ---
      proxy: {
        // Route requests starting with '/api' to the FastAPI backend
        '/api': {
          // FastAPI typically runs on port 8000 by default
          target: 'http://127.0.0.1:8000', // FastAPI backend address

          // Change the origin header to the target URL
          // Often required for backend validation.
          changeOrigin: true,

          // Set to false if backend is HTTP or uses self-signed HTTPS cert
          secure: false, // FastAPI backend is likely HTTP during dev

          // Keep the '/api' prefix since FastAPI endpoints don't expect it removed
          // The backend endpoints are: /doc, /get_response, etc.
          // So /api/doc becomes http://127.0.0.1:8000/api/doc
          // But we want it to be http://127.0.0.1:8000/doc
          rewrite: (path) => path.replace(/^\/api/, ''),

          // Uncomment if your FastAPI app uses WebSockets on the same API prefix
          // ws: true,
        }
        // Add more proxy rules here if needed for other backend services
      }
      // --- End of proxy configuration ---
    },
    plugins: plugins.filter(Boolean), // Ensure no falsy values in plugins array
    resolve: {
      alias: {
        // Your existing alias setting
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});