<script>
    import Avatar from "./avatar.svelte"
</script>

<style>
    title-text {
        /* display: grid; */
        display: flex;
        align-items: center;
        justify-content: start;

        font-family: KingdomHearts;
        font-size: 52px;

        background-color: var(--primary);
        color: black;

        gap: 8px;
        padding: 4px;

        position: sticky;
        top: 0px;

        box-shadow: 0px 3px 4px rgb(0 0 0 / 50%);
    }
</style>

<title-text>
    <Avatar />

    <div>
        Axel669
    </div>
</title-text>
