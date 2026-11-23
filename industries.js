(() => {
  "use strict";

  function initializeExplorer() {
    const explorer = document.querySelector(".industries-explorer");
    if (!explorer || explorer.dataset.ready) return;

    const industryLinks = Array.from(explorer.querySelectorAll(".industry-list a"));
    const cases = new Map(Array.from(explorer.querySelectorAll(".industry-case"), entry => [entry.id, entry]));
    const defaultId = industryLinks[0].hash.slice(1);
    const navigators = new Map();
    let activeCaseId;

    function installStages(entry) {
      const flow = entry.querySelector(".industry-workflow");
      const stages = Array.from(flow.querySelectorAll(".industry-stage"));
      const switcher = document.createElement("div");
      switcher.className = "industry-stage-tabs";
      switcher.setAttribute("role", "tablist");
      switcher.setAttribute("aria-label", "Workflow stage");

      const controls = stages.map((stage, index) => {
        const title = stage.querySelector("h4");
        const tab = document.createElement("button");
        tab.type = "button";
        tab.id = entry.id + "-tab-" + index;
        tab.textContent = title.textContent;
        tab.setAttribute("role", "tab");
        stage.id = entry.id + "-stage-" + index;
        stage.setAttribute("role", "tabpanel");
        stage.setAttribute("aria-labelledby", tab.id);
        stage.tabIndex = 0;
        tab.setAttribute("aria-controls", stage.id);
        title.hidden = true;
        switcher.append(tab);
        return tab;
      });

      function selectStage(selected, focus = false) {
        controls.forEach((tab, index) => {
          const active = index === selected;
          tab.setAttribute("aria-selected", String(active));
          tab.tabIndex = active ? 0 : -1;
          stages[index].hidden = !active;
        });
        if (focus) controls[selected].focus();
      }

      controls.forEach((tab, index) => {
        tab.addEventListener("click", () => selectStage(index));
        tab.addEventListener("keydown", event => {
          const destination = {
            ArrowRight: (index + 1) % controls.length,
            ArrowLeft: (index + controls.length - 1) % controls.length,
            Home: 0,
            End: controls.length - 1
          }[event.key];
          if (destination === undefined) return;
          event.preventDefault();
          selectStage(destination, true);
        });
      });
      flow.prepend(switcher);
      selectStage(0);
      return selectStage;
    }

    for (const [id, entry] of cases) navigators.set(id, installStages(entry));

    function showCase(id) {
      if (!cases.has(id) || activeCaseId === id) return;
      activeCaseId = id;
      for (const [caseId, entry] of cases) entry.hidden = caseId !== id;
      for (const link of industryLinks) {
        if (link.hash.slice(1) === id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
      navigators.get(id)(0);
    }

    function restoreLocation() {
      const id = window.location.hash.slice(1);
      showCase(cases.has(id) ? id : defaultId);
    }

    for (const link of industryLinks) {
      link.addEventListener("click", event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const id = link.hash.slice(1);
        if (window.location.hash !== link.hash) {
          try {
            history.pushState(null, "", link.hash);
          } catch {
            window.location.hash = link.hash;
          }
        }
        showCase(id);
        if (window.matchMedia("(max-width: 700px)").matches) {
          const heading = cases.get(id).querySelector("h3");
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
          cases.get(id).scrollIntoView({ block: "start", behavior: "instant" });
        }
      });
    }

    window.addEventListener("hashchange", restoreLocation);
    window.addEventListener("popstate", restoreLocation);
    restoreLocation();
    explorer.dataset.ready = "true";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initializeExplorer, { once: true });
  else initializeExplorer();
})();
