import { useState } from "react";

// useRerender is a utility hook that is helpful in creating other more complex hooks
function useRerender() {
    const [value, setValue] = useState(true)

    // toggle the value, which triggers a rerender:
    return () => setValue(oldValue => !oldValue)
}

function useMyCustomHook() {
    const rerender = useRerender()

    /* ...code... */
    rerender()
    /* ...code... */
}
