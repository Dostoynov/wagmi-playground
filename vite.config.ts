import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    proxy: {
      "/superform": {
        target: "https://api.superform.xyz",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/superform/, ""),
      },
      "/deposit": {
        target: "https://api.superform.xyz",
        changeOrigin: true,
        secure: true,
        // no rewrite: keep '/deposit/...' so upstream receives '/deposit/...'
      },
    },
  },
});


