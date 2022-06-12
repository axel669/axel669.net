<script>
    import IconLink from "./icon-link.svelte"

    const links = [
        {
            icon: "gitHub:brands",
            href: "https://github.com/axel669",
        },
        {
            icon: "twitch:brands",
            href: "https://www.twitch.tv/axel669",
        },
        {
            icon: "twitter:brands",
            href: "https://twitter.com/Axel669",
        },
        {
            icon: "linkedin:brands",
            href: "https://www.linkedin.com/in/chris-morgan-26487082/",
        },
    ]
</script>

<style>
    site-footer {
        display: grid;
        grid-template-columns: repeat(4, 32px) auto 32px;

        background-color: var(--monitor-border);
    }
</style>

<site-footer>
    {#each links as {icon, href}}
        <IconLink {icon} {href} />
    {/each}
    <div />
    <IconLink icon="power-off" href="#" color="green" />
</site-footer>
