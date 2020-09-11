<script>
    import {
        Adornment,
        Card,
        Divider,
        List,
        ListItem,
        ListHeader,
        ListItemContent,
    } from "svelte-doric"

    export let socials
    export let projects
;</script>

<style>
    icon {
        font-size: 36px;
    }
</style>

<List>
    <ListHeader color="primary">
        Socials
    </ListHeader>
    {#each socials as [href, text] (href)}
        <ListItem {href}>
            <Adornment position="start">
                <icon class="ion-logo-{text.toLowerCase()}" />
            </Adornment>
            <ListItemContent>
                {text}
            </ListItemContent>
        </ListItem>
    {/each}

    <Divider />

    <ListHeader color="secondary">
        Open Source Projects
    </ListHeader>
    {#each projects as [href, text] (href)}
        <ListItem {href}>
            <ListItemContent>
                {text}
            </ListItemContent>
        </ListItem>
    {/each}
</List>
