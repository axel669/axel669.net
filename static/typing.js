document.addEventListener(
    "DOMContentLoaded",
    function() {
        function type(element) {
            const text = element.innerText
            let pos = 0

            function keystroke() {
                pos += 1

                if (pos === text.length) {
                    element.style.setProperty("--text", `""`)
                    element.style.color = "white"
                    return
                }

                const typed = text.slice(0, pos)
                element.style.setProperty("--text", `"${typed}|"`)

                setTimeout(keystroke, 50)
            }
            keystroke()
        }

        const typers = document.querySelectorAll("type-text")

        for (const elem of typers) {
            type(elem)
        }
    }
)
