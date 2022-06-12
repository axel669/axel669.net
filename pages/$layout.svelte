<svelte:head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,minimum-scale=1,width=device-width" />
    <link rel="icon" type="image/png" href="./images/megaman-rounded.png" />

    <link
        rel="stylesheet"
        href="https://ka-f.fontawesome.com/releases/v6.0.0/css/free.min.css?token=0011e611c6"
    >

    <script src="typing.js"></script>
</svelte:head>

<script>
    import Footer from "../comp/footer.svelte"
    import Paper from "../comp/paper.svelte"
    import Titlebar from "../comp/titlebar.svelte"
</script>

<style>
    :global(*) {
        box-sizing: border-box;
    }

    :global(html, body) {
        width: 100%;
        height: 100%;
        margin: 0px;
        padding: 0px;
    }

    @font-face {
        font-family: "Megaman";
        src: url(./font/megaman2.woff) format("woff");
    }
    @font-face {
        font-family: "KingdomHearts";
        src: url(./font/kh.ttf) format("truetype");
    }

    :global(body) {
        background-color: #030303;
        color: #ffffff;
        font-family: Megaman;

        --primary: #00aaff;
        --monitor-border: white;
    }

    :global(body::before) {
        position: fixed;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
        content: "";

        background-image: url(images/bg/city-wallpaper.png);
        background-position: center center;
        background-size: cover;
        background-repeat: no-repeat;
        opacity: 0.15;
        z-index: -1;
    }

    content-area {
        display: block;
        overflow-y: auto;
        height: 100%;
        padding: 4px;
    }
</style>

<Paper>
    <Titlebar />
    <content-area>
        <slot />
    </content-area>
    <Footer />
</Paper>
