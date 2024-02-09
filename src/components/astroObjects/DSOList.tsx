import { useState, useEffect, useContext } from "react";

import { AstroObject } from "@/types";
import DSOObject from "@/components/astroObjects/DSOObject";
import DSOSearch from "@/components/astroObjects/DSOSearch";
import { pluralize } from "@/lib/text_utils";
import { ConnectionContext } from "@/stores/ConnectionContext";

let objectTypesMenu = [
  { value: "all", label: "All" },
  { value: "clusters", label: "Clusters" },
  { value: "galaxies", label: "Galaxies" },
  { value: "nebulae", label: "Nebulae" },
  { value: "stars", label: "Stars" },
  { value: "mosaic", label: "Mosaic" },
];

type PropType = {
  objects: AstroObject[];
};

export default function DSOList(props: PropType) {
  let connectionCtx = useContext(ConnectionContext);
  let dsoObjects: AstroObject[] = props.objects;

  const [objects, setObjects] = useState(dsoObjects);
  const [selectedCategories, setSelectedCategories] = useState(["all"]);

  useEffect(() => {
    filterObjects();
  }, [selectedCategories, dsoObjects]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectCategoryHandler(targetCategory: string) {
    if (targetCategory === "all") {
      setSelectedCategories(["all"]);
      // remove category
    } else if (selectedCategories.includes(targetCategory)) {
      if (selectedCategories.length === 1) {
        setSelectedCategories(["all"]);
      } else {
        setSelectedCategories(
          selectedCategories.filter((type) => type !== targetCategory)
        );
      }
      // add category
    } else {
      setSelectedCategories((prev) =>
        prev.filter((type) => type !== "all").concat([targetCategory])
      );
    }
  }

  function filterObjects() {
    let dataSearchTxt = "";
    if (connectionCtx.searchTxt) dataSearchTxt = connectionCtx.searchTxt;

    if (selectedCategories.includes("all")) {
      if (dataSearchTxt)
        setObjects(
          dsoObjects.filter((object) => {
            return object.displayName
              .toLowerCase()
              .includes(dataSearchTxt.toLowerCase());
          })
        );
      else setObjects(dsoObjects);
    } else {
      setObjects(
        dsoObjects.filter((object) => {
          if (dataSearchTxt)
            return (
              selectedCategories.includes(object.typeCategory) &&
              object.displayName
                .toLowerCase()
                .includes(dataSearchTxt.toLowerCase())
            );
          else return selectedCategories.includes(object.typeCategory);
        })
      );
    }
  }

  return (
    <div>
      <ul className="nav nav-pills mt-3">
        {objectTypesMenu.map((type) => (
          <li
            key={type.value}
            className={`nav-item nav-link rounded-pill ${
              selectedCategories.includes(type.value) ? "active" : ""
            }`}
            onClick={() => selectCategoryHandler(type.value)}
          >
            {type.label}
          </li>
        ))}
      </ul>
      <hr />
      <DSOSearch />
      <hr />
      <h4 className="mt-3">
        {objects.length} {pluralize(objects.length, "Object", "Objects")}
      </h4>
      {objects.map((object, i) => (
        <DSOObject key={i} object={object} />
      ))}
    </div>
  );
}
