<svelte:head>
    <link href="https://unpkg.com/ionicons@4.5.10-0/dist/css/ionicons.min.css" rel="stylesheet">
</svelte:head>

<script>
    import AppStyle from "svelte-doric/core/app-style.svelte"
    import baseline from "svelte-doric/core/baseline.svelte"

    import Avatar from "svelte-doric/core/avatar.svelte"
    import Card from "svelte-doric/core/card.svelte"
    import TitleBar from "svelte-doric/core/title-bar.svelte"

    import theme from "./theme.svelte"
    import Links from "./links.svelte"

    import projectLinks from "./project-links.js"
</script>

<AppStyle {baseline} {theme} />

<style>
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
        padding: 4px;

        display: grid;
    }

    app-title {
        display: flex;
        justify-content: center;
        align-items: center;
        grid-area: title;
        font-weight: 700;
        font-size: 18px;
    }
</style>

<mobile-test>
    <content-wrapper>
        <Card>
            <TitleBar>
                <app-title>
                    <Avatar image="./images/megaman-rounded.png" />
                    &nbsp;Axel669
                </app-title>
            </TitleBar>
            <Links links={projectLinks} />
        </Card>
    </content-wrapper>
</mobile-test>
