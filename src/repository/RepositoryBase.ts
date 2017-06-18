import { getConnectionManager, QueryBuilder, Repository } from "typeorm";
import { IRepositoryBase } from "./interfaces/IRepositoryBase";
import { IQuery } from "../query/interfaces/IQuery";
import { Query } from "../query/Query";

/**
 * Base repository operations for TypeORM entities.
 */
export abstract class RepositoryBase<T extends { id: number }> implements IRepositoryBase<T> {
    protected readonly _repository: Repository<T>;

    constructor(entityType: { new (...params: any[]): T; }) {
        this._repository = getConnectionManager().get().getRepository<T>(entityType);
    }

    public createMany(entities: T[]): Promise<T[]> {
        entities.forEach((entity: T) => {
            entity.id = null;
        });
        return this.persistMany(entities);
    }

    public createOne(entity: T): Promise<T> {
        entity.id = null;
        return this.persistOne(entity);
    }

    public createQueryBuilder(alias: string): QueryBuilder<T> {
        return this._repository.createQueryBuilder(alias);
    }

    public getAll(alias?: string): IQuery<T, T[]> {
        let queryBuilder: QueryBuilder<T> = this.createQueryBuilder(alias || "entity");
        let query: IQuery<T, T[]> = new Query(
            queryBuilder, queryBuilder.getMany
        );
        return query;
    }

    public getById(id: number): IQuery<T, T> {
        let alias: string = "entity";
        let queryBuilder: QueryBuilder<T> = this.createQueryBuilder(alias);
        queryBuilder = queryBuilder.where(`${alias}.id = :id`, { id: id });
        let query: IQuery<T, T> = new Query(
            queryBuilder, queryBuilder.getOne
        );
        return query;
    }

    public getOne(alias?: string): IQuery<T, T> {
        let queryBuilder: QueryBuilder<T> = this.createQueryBuilder(alias || "entity");
        let query: IQuery<T, T> = new Query(
            queryBuilder, queryBuilder.getOne
        );
        return query;
    }

    public persistMany(entities: T[]): Promise<T[]> {
        return this._repository.persist(entities);
    }

    public persistOne(entity: T): Promise<T> {
        return this._repository.persist(entity);
    }

    public removeMany(entities: T[]): Promise<T[]> {
        return this._repository.remove(entities);
    }

    public removeOne(entity: T): Promise<T> {
        return this._repository.remove(entity);
    }
}