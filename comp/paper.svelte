<style>
    paper-site {
        display: grid;
        width: min(100%, 640px);
        height: min(100%, 480px);

        grid-template-columns: 1fr;
        grid-template-rows: 64px auto 32px;

        border: 4px solid var(--monitor-border);
        background-color: rgba(0, 0, 0, 0.75);
        border-radius: 4px;

        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);

        animation-name: main-screen-turn-on;
        animation-duration: 750ms;
        animation-iteration-count: 1;
    }
    paper-site::before {
        position: absolute;
        top: 0px;
        left: 0px;
        bottom: 0px;
        right: 0px;
        content: "";

        background-image: url(images/bg/axel-minimalist.png);
        background-position: 85% 50%;
        background-size: cover;
        background-repeat: no-repeat;
        opacity: 0.15;
        z-index: -1;
    }

    @keyframes main-screen-turn-on {
        0% {
            transform: translate(-50%, -50%) scaleX(5%) scaleY(5%);
        }
        50% {
            transform: translate(-50%, -50%) scaleX(100%) scaleY(5%);
        }
        100% {
            transform: translate(-50%, -50%) scaleX(100%) scaleY(100%);
        }
    }
</style>

<paper-site>
    <slot />
</paper-site>
