<script>
    export let icon
    export let href
    export let color = "black"

    $: [icon, base = "solid"] = (icon || "").split(":")
</script>

<style>
    a, a:hover, a:active, a:visited {
        color: var(--color);
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
    }

    site-icon {
        margin: 0px 4px;
    }
</style>

<a {href} target="_blank" style="--color: {color};">
    <site-icon class="fa-{base} fa-{icon}" />
</a>
