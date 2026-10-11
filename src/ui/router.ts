export type Routes = Record<string, (params: string[]) => void>;

export function startRouter(routes: Routes): void {
  const dispatch = () => {
    const [name = "", ...params] = window.location.hash.replace(/^#\/?/, "").split("/");
    const handler = routes[name] ?? routes[""];
    handler(name in routes ? params : []);
  };
  window.addEventListener("hashchange", dispatch);
  dispatch();
}
