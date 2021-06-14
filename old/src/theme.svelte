<script>
    // import {DarkTheme, css} from "svelte-doric"
    import TronTheme from "svelte-doric/core/theme/tron.svelte"
    import css from "svelte-doric/core/util/css.js"

    const themeCSS = css`
        body {
            --background-layer: #000000a4;
            --font: Megaman;
        }

        @font-face {
            font-family: "Megaman";
            src: url(./font/megaman2.woff) format("woff");
        }
    `
</script>

<TronTheme />
{@html themeCSS}
