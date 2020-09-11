<script>
    import {DarkTheme, css} from "svelte-doric"

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
;</script>

<DarkTheme />
{@html themeCSS}
