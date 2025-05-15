// import { useMemo } from "react";
// import { useAppConfig } from "@/app/store";
// import { collectModelsWithDefaultModel } from "@/app/utils/model";

// export function useAllModels() {
//   const configStore = useAppConfig();
//   const models = useMemo(() => {
//     return collectModelsWithDefaultModel(
//       configStore.models,
//       [configStore.customModels, accessStore.customModels].join(","),
//       accessStore.defaultModel,
//     );
//   }, [
//     accessStore.customModels,
//     accessStore.defaultModel,
//     configStore.customModels,
//     configStore.models,
//   ]);

//   return models;
// }
