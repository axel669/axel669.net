<svelte:head>
    <title>Axel669</title>
</svelte:head>

<script>
    import Card from "../comp/card.svelte"

    const projects = [
        { project: "teascript", label: "TeaScript" },
        { project: "svelte-doric", label: "Svelte Doric" },
        { project: "hermod", label: "Hermod Twitch Bot" },
        { project: "axel-query", label: "Axel Query" },
        { project: "kingsport", label: "Kingsport" },
        { project: "norn", label: "Norn" },
        { project: "sanic-xml", label: "Sanic XML" },
    ]
</script>

<style>
    tagline-text {
        font-size: 11px;
    }

    a, a:hover, a:visited {
        display: block;
        color: white;
        text-decoration: none;
        padding: 8px 4px;
        font-size: 14px;
    }

    type-text {
        display: block;
        color: transparent;
        position: relative;
        user-select: none;
    }
    type-text::before {
        content: var(--text);
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        color: white;
    }
</style>

<tagline-text>
    <type-text>
        There are no things, but as a consequence,
        there are as many things as we like.
    </type-text>
</tagline-text>

<Card title="About Me">
    <type-text>
        Creator of simple & robust web apps for a variety of uses,
        currently at Skechers improving internal comminucation and
        orders.
    </type-text>
</Card>

<Card title="Open Source Projects">
    {#each projects as {project, label}}
        <a href="https://github.com/axel669/{project}" target="_blank">
            <type-text>&gt; {label}</type-text>
        </a>
    {/each}
</Card>
