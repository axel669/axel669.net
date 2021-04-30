<svelte:head>
    <link href="https://unpkg.com/ionicons@4.5.10-0/dist/css/ionicons.min.css" rel="stylesheet">
</svelte:head>

<script>
    import {
        AppTheme,
        Baseline as baseline,

        AppBar,
        Avatar,
        Card,
    } from "svelte-doric"

    import theme from "./theme.svelte"
    import Links from "./links.svelte"

    const socials = [
        ["https://github.com/axel669", "Github"],
        ["https://www.twitch.tv/axel669", "Twitch"],
        ["https://twitter.com/Axel669", "Twitter"],
        ["https://www.linkedin.com/pub/chris-morgan/82/870/264", "LinkedIn"]
    ]

    const projects = [
        ["https://github.com/axel669/svelte-doric", "Svelte Doric"],
        ["https://github.com/axel669/axel-query", "Axel Query"],
        ["https://github.com/axel669/norn", "Norn"],
        ["#", "Kingsport (Coming Soon)"],
        ["#", "Ratatoskr (Coming Soon)"]
    ]
;</script>

<AppTheme {baseline} {theme} />

<style>
    :global(body, html) {
        width: 100%;
        height: 100%;
        position: fixed;
        overflow: hidden;
    }
    :global(body::before) {
        position: fixed;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
        content: "";

        background-image: url(images/axel-minimalist-bg.png);
        background-position: 75% 50%;
        background-size: cover;
        background-repeat: no-repeat;
        opacity: 0.25;
        z-index: -1;
    }

    mobile-test {
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        overflow: auto;
    }
    content-wrapper {
        width: 100%;
        max-width: 320px;

        display: grid;
    }

    app-title {
        justify-content: center;
    }
</style>

<mobile-test>
    <content-wrapper>
        <Card>
            <AppBar>
                <app-title>
                    <Avatar image="./images/megaman-rounded.png" />
                    &nbsp;Axel669
                </app-title>
            </AppBar>
            <Links {socials} {projects} />
        </Card>
    </content-wrapper>
</mobile-test>
