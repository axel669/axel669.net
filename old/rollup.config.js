import svelte from "rollup-plugin-svelte"
import commonjs from "rollup-plugin-commonjs"
import resolve from "rollup-plugin-node-resolve"

export default {
    input: "./src/main.js",
    output: {
        file: "./output/app.js",
        format: "iife",
    },
    plugins: [
        svelte(),
        resolve(),
        commonjs()
    ]
}
