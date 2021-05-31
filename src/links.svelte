<script>
    import Adornment from "svelte-doric/core/adornment.svelte"
    import Card from "svelte-doric/core/card.svelte"
    import Divider from "svelte-doric/core/divider.svelte"
    import List from "svelte-doric/core/list.svelte"

    export let links
;</script>

<style>
    icon {
        font-size: 36px;
    }

    list-header-content[color="primary"] {
        color: var(--primary);
    }
    list-header-content[color="secondary"] {
        color: var(--secondary);
    }
    list-item-content {
        padding: 8px;
    }

    a {
        user-select: none;
        position: absolute;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        opacity: 0;
    }
</style>

<List let:item items={links}>
    <list-header slot="header">
        <list-header-content color={item.color}>
            {item.header}
        </list-header-content>
    </list-header>

    <list-item>
        {#if item.logo}
            <Adornment position="start">
                <icon class="ion-logo-{item.text.toLowerCase()}" />
            </Adornment>
        {/if}
        <list-item-content>
            {item.text}
        </list-item-content>
        <a href={item.url} target="_blank">&nbsp;</a>
    </list-item>
</List>
