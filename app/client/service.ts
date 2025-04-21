

// // --- React Context for providing the ApiService ---

// // Create a context with null default value
// const ApiServiceContext = createContext<ApiService | null>(null);

// // Define Props type for clarity
// interface ApiServiceProviderProps {
//   children: React.ReactNode;
//   service: ApiService | null;
// }

// /**
//  * Provider component wrapper.
//  * Uses standard functional component syntax.
//  */
// export const ApiServiceProvider: React.FC<ApiServiceProviderProps> = (props) => {
//   const { children, service } = props;

//   return (
//     <ApiServiceContext.Provider value={service}>
//       {children}
//     </ApiServiceContext.Provider>
//   );
// };

// /**
//  * Custom hook to access the ApiService instance from components.
//  * Throws an error if used outside of an ApiServiceProvider.
//  */
// export const useApiService = (): ApiService => {
//   const context = useContext(ApiServiceContext);
//   if (!context) {
//     // This error indicates a setup issue - the hook is used where the Provider isn't wrapping it.
//     throw new Error('useApiService must be used within an ApiServiceProvider. Make sure ApiServiceProvider wraps your component tree.');
//   }
//   return context;
// }; 