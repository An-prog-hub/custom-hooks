const { useReducer, useEffect } = require("react");

// helper function that returns a fetch function as well as an abort method so we can cancel the fetch if needed
// https://developers.google.com/web/updates/2017/09/abortable-fetch
function createAbortableFetch() {
  const controller = new AbortController();
  const { signal } = controller;

  return {
    fetch: (url, options) => fetch(url, { ...options, signal }),
    abort: () => controller.abort(),
  };
}

// we'll use this object to *memoize* the results from calling fetch
// ideally, this wouldn't be a variable outside of the hook
// (could use context and a ref instead as a way of sharing this data between components)
const cache = {};

// reducer function for our fetch state
function fetchReducer(state, action) {
  switch (action.type) {
    case "pending":
      return { status: "pending", data: null, error: null };
    case "resolved":
      return { status: "resolved", data: action.payload, error: null };
    case "rejected":
      return { status: "rejected", data: null, error: action.payload };
    default:
      throw new Error(`No action defined for type ${action.type}`);
  }
}

// here's a more optimized version of the useQuery hook
function useQuery(url, initialData = null) {
  // using a reducer helps ensure consistent state
  // and prevents us from getting into 'impossible' states
  const [{ status, data, error }, dispatch] = useReducer(fetchReducer, {
    status: "idle",
    data: initialData,
    error: null,
  });

  useEffect(() => {
    if (cache[url]) {
      // if the result is cached, we can return it and show it immediately to the user
      dispatch({ type: "resolved", payload: cache[url] });
    } else {
      // otherwise, show them the pending state while we fetched
      dispatch({ type: "pending" });
    }

    // even if the result is cached on the client's machine, might be a good idea
    // to get the fresh data from the server, in case there were updates on the
    // server after the user cached the initial response

    // this is what we'll use to cancel the fetch if the component un-mounts before fetch resolves
    const { fetch, abort } = createAbortableFetch();

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        // save response to cache
        cache[url] = data;
        // dispatch the saved data
        dispatch({ type: "resolved", payload: data });
      })
      .catch((err) => {
        // AbortError will be thrown if we cancel the fetch request
        if (err.name !== "AbortError") {
          // for other errors, we can dispatch them so they're set into state
          dispatch({ type: "rejected", payload: err });
        }
      });

    return function () {
      // cancel the fetch request if the component un-mounts
      abort();
    };
  }, [url]);

  return {
    data,
    isLoaded: status === "resolved",
    isError: status === "rejected",
    error,
  };
}

export default useQuery;
