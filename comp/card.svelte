<script>
    export let title
</script>

<style>
    fieldset {
        margin: 8px 0px;
        border: 2px solid var(--primary);
        border-radius: 4px;
        font-size: 13px;
    }

    legend {
        font-size: 16px;
    }

    card-content {
        display: flex;
        flex-direction: column;
    }
</style>

<fieldset>
    <legend>{title}</legend>
    <card-content>
        <slot />
    </card-content>
</fieldset>
