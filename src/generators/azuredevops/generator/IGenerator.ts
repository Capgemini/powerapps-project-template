export interface IGenerator<TGeneratedType> {
  createdObjects: TGeneratedType[];
  rollback(project: string): Promise<void>;
}
