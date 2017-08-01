import { QueryWhereType } from '../enums/QueryWhereType';
import { nameof } from "ts-simple-nameof";
import { ObjectLiteral, SelectQueryBuilder } from "typeorm";
import { IComparableQuery } from './interfaces/IComparableQuery';
import { IQuery } from "./interfaces/IQuery";
import { IQueryBuilderPart } from "./interfaces/IQueryBuilderPart";
import { QueryBuilderPart } from "./QueryBuilderPart";

export class Query<T extends { id: number }, R = T | T[], P = T> implements IQuery<T, R, P>, IComparableQuery<T, R, P> {
    private _getAction: () => Promise<R>;
    private _includeAliasHistory: string[];
    private _initialAlias: string;
    private _lastAlias: string;
    private _query: SelectQueryBuilder<T>;
    private _queryParts: IQueryBuilderPart<T>[];
    private _queryWhereType: QueryWhereType;

    /**
     * Constructs a Query wrapper.
     * @param queryBuilder The QueryBuilder to wrap.
     * @param getAction Either queryBuilder.getOne or queryBuilder.getMany.
     */
    constructor(queryBuilder: SelectQueryBuilder<T>, getAction: () => Promise<R>) {
        this._getAction = getAction;
        this._includeAliasHistory = [];
        this._initialAlias = queryBuilder.alias;
        this._lastAlias = this._initialAlias;
        this._query = queryBuilder;
        this._queryParts = [];
        this._queryWhereType = QueryWhereType.Normal;
    }

    public and<S extends Object>(propertySelector: (obj: P) => S, subPropertySelector?: (obj: S) => any): IComparableQuery<T, R, P> {
        let whereProperty: string = nameof<P>(propertySelector);
        if (this._queryWhereType === QueryWhereType.Include) {
            this.addJoinCondition(whereProperty, "AND");
        }
        else if (subPropertySelector) {
            let whereConditionProperty: string = nameof<S>(subPropertySelector);
            this._queryWhereType = QueryWhereType.InnerJoin;
            this.createJoinCondition(whereProperty, whereConditionProperty);
        }
        else {
            let where: string = `${this._initialAlias}.${whereProperty}`;
            this._queryParts.push(new QueryBuilderPart(
                this._query.andWhere, [where]
            ));
        }
        return this;
    }

    public beginsWith(value: string): IQuery<T, R, P> {
        return this.completeWhere("LIKE", value, true, true, false);
    }

    public catch(rejected: (error: any) => void | Promise<any> | IQuery<any, any>): Promise<any> {
        return this.toPromise().catch(rejected);
    }

    public contains(value: string): IQuery<T, R, P> {
        return this.completeWhere("LIKE", value, true, true, true);
    }

    public endsWith(value: string): IQuery<T, R, P> {
        return this.completeWhere("LIKE", value, true, false, true);
    }

    public equal(value: string | number | boolean): IQuery<T, R, P> {
        return this.completeWhere("=", value);
    }

    public greaterThan(value: number): IQuery<T, R, P> {
        return this.completeWhere(">", value);
    }

    public greaterThanOrEqual(value: number): IQuery<T, R, P> {
        return this.completeWhere(">=", value);
    }

    public include<S>(propertySelector: (obj: T) => S | S[]): IQuery<T, R, S> {
        return this.includePropertyUsingAlias<S>(propertySelector, this._initialAlias);
    }

    public includeWhere<S extends Object>(propertySelector: (obj: T) => S[], subPropertySelector: (obj: S) => any): IComparableQuery<T, R, S> {
        let includeProperty: string = nameof<T>(propertySelector);
        let includeConditionProperty: string = nameof<S>(subPropertySelector);
        this.createJoinCondition(includeProperty, includeConditionProperty);
        this._queryWhereType = QueryWhereType.Include;
        return <IComparableQuery<T, R, S>><any>this;
    }

    public isFalse(): IQuery<T, R, P> {
        this.completeWhere("=", false);
        return this;
    }

    public isTrue(): IQuery<T, R, P> {
        this.completeWhere("=", true);
        return this;
    }

    public lessThan(value: number): IQuery<T, R, P> {
        return this.completeWhere("<", value);
    }

    public lessThanOrEqual(value: number): IQuery<T, R, P> {
        return this.completeWhere("<=", value);
    }

    public notEqual(value: string | number | boolean): IQuery<T, R, P> {
        return this.completeWhere("!=", value);
    }

    public notNull(): IQuery<T, R, P> {
        return this.completeWhere("IS", "NOT NULL", false);
    }

    public null(): IQuery<T, R, P> {
        return this.completeWhere("IS", "NULL", false);
    }

    public or<S extends Object>(propertySelector: (obj: P) => S, subPropertySelector?: (obj: S) => any): IComparableQuery<T, R, P> {
        let whereProperty: string = nameof<P>(propertySelector);
        if (this._queryWhereType === QueryWhereType.Include) {
            this.addJoinCondition(whereProperty, "OR");
        }
        else if (subPropertySelector) {
            let whereConditionProperty: string = nameof<S>(subPropertySelector);
            this._queryWhereType = QueryWhereType.InnerJoin;
            this.createJoinCondition(whereProperty, whereConditionProperty);
        }
        else {
            let where: string = `${this._initialAlias}.${whereProperty}`;
            this._queryParts.push(new QueryBuilderPart(
                this._query.orWhere, [where]
            ));
        }
        return this;
    }

    public orderBy(propertySelector: (obj: P) => any): IQuery<T, R, P> {
        let propertyName: string = nameof<P>(propertySelector);
        let orderProperty: string = `${this._lastAlias}.${propertyName}`;
        this._queryParts.push(new QueryBuilderPart(
            this._query.orderBy, [orderProperty, "ASC"]
        ));
        return this;
    }

    public orderByDescending(propertySelector: (obj: P) => any): IQuery<T, R, P> {
        let propertyName: string = nameof<P>(propertySelector);
        let orderProperty: string = `${this._lastAlias}.${propertyName}`;
        this._queryParts.push(new QueryBuilderPart(
            this._query.orderBy, [orderProperty, "DESC"]
        ));
        return this;
    }

    public skip(skip: number): IQuery<T, R, P> {
        if (skip > 0) {
            this._queryParts.push(new QueryBuilderPart(
                this._query.setFirstResult, [skip]
            ));
        }
        return this;
    }

    public take(limit: number): IQuery<T, R, P> {
        if (limit > 0) {
            this._queryParts.push(new QueryBuilderPart(
                this._query.setMaxResults, [limit]
            ));
        }
        return this;
    }

    public then(resolved: (results: R) => void | Promise<any>): Promise<any> {
        return this.toPromise().then(resolved);
    }

    public thenBy(propertySelector: (obj: P) => any): IQuery<T, R, P> {
        let propertyName: string = nameof<P>(propertySelector);
        let orderProperty: string = `${this._lastAlias}.${propertyName}`;
        this._queryParts.push(new QueryBuilderPart(
            this._query.addOrderBy, [orderProperty, "ASC"]
        ));
        return this;
    }

    public thenByDescending(propertySelector: (obj: P) => any): IQuery<T, R, P> {
        let propertyName: string = nameof<P>(propertySelector);
        let orderProperty: string = `${this._lastAlias}.${propertyName}`;
        this._queryParts.push(new QueryBuilderPart(
            this._query.addOrderBy, [orderProperty, "DESC"]
        ));
        return this;
    }

    public thenInclude<S>(propertySelector: (obj: P) => S | S[]): IQuery<T, R, S> {
        return this.includePropertyUsingAlias<S>(propertySelector, this._lastAlias);
    }

    public thenIncludeWhere<S extends Object>(propertySelector: (obj: P) => S[], subPropertySelector: (obj: S) => any): IComparableQuery<T, R, S> {
        let includeProperty: string = nameof<P>(propertySelector);
        let includeConditionProperty: string = nameof<S>(subPropertySelector);
        this.createJoinCondition(includeProperty, includeConditionProperty);
        this._queryWhereType = QueryWhereType.Include;
        return <IComparableQuery<T, R, S>><any>this;
    }

    public toPromise(): Promise<R> {
        // Unpack and apply the QueryBuilder parts.
        if (this._queryParts.length) {
            for (let queryPart of this._queryParts) {
                queryPart.queryAction.call(this._query, ...queryPart.queryParams);
            }
        }
        return this._getAction.call(this._query);
    }

    public usingBaseType(): IQuery<T, R, T> {
        return <IQuery<T, R, T>><any>this;
    }

    public where<S extends Object>(propertySelector: (obj: T) => S, subPropertySelector?: (obj: S) => any): IComparableQuery<T, R, T> {
        let whereProperty: string = nameof<T>(propertySelector);
        if (subPropertySelector) {
            let whereConditionProperty: string = nameof<S>(subPropertySelector);
            this._queryWhereType = QueryWhereType.InnerJoin;
            this.createJoinCondition(whereProperty, whereConditionProperty);
        }
        else {
            let where: string = `${this._initialAlias}.${whereProperty}`;
            this._queryParts.push(new QueryBuilderPart(
                this._query.where, [where]
            ));
            this._queryWhereType = QueryWhereType.Normal;
        }
        return <IComparableQuery<T, R, T>><any>this;
    }

    private addJoinCondition(whereProperty: string, condition: "AND" | "OR"): void {
        // [QueryBuilder.leftJoinAndSelect, ["alias.includedProperty", "includedProperty", "includedProperty.property = 'something'"]]
        let part: IQueryBuilderPart<T> = this._queryParts.pop();
        // "includedProperty.property = 'something'"
        let joinCondition: string = (<[string]>part.queryParams).pop();
        // "includedProperty"
        let joinAlias: string = (<[string]>part.queryParams).pop();
        // "otherProperty"
        // "includedProperty.property = 'something' <AND/OR> includedProperty.otherProperty" (to be finished in completeWhere())
        joinCondition += ` ${condition} ${joinAlias}.${whereProperty}`;
        (<[string]>part.queryParams).push(joinAlias);
        (<[string]>part.queryParams).push(joinCondition);
        this._queryParts.push(part);
    }

    private completeWhere(operator: string, value: string | number | boolean, quoteString: boolean = true, beginsWith: boolean = false, endsWith: boolean = false): IQuery<T, R, P> {
        if (beginsWith) {
            value += "%";
        }
        if (endsWith) {
            value = `%${value}`;
        }
        if (this._queryWhereType !== QueryWhereType.Normal) {
            if (typeof value === "string" && quoteString) {
                value = value.replace(/'/g, "''");
                value = `'${value}'`;
            }
            // [QueryBuilder.leftJoinAndSelect, ["alias.includedProperty", "includedProperty", "includedProperty.property"]]
            let part: IQueryBuilderPart<T> = this._queryParts.pop();
            // "includedProperty.property"
            let joinCondition: string = (<[string]>part.queryParams).pop();
            // "includedProperty.property = 'something'"
            joinCondition += ` ${operator} ${value}`;
            (<[string]>part.queryParams).push(joinCondition);
            this._queryParts.push(part);
        }
        else {
            // [QueryBuilder.<where | andWhere | orWhere>, ["alias.property"]]
            let part: IQueryBuilderPart<T> = this._queryParts.pop();
            // "alias.property"
            let where: string = (<[string]>part.queryParams).pop();
            where += ` ${operator} :value`;
            let whereParam: ObjectLiteral = { value: value };
            (<[string, ObjectLiteral]>part.queryParams).push(where);
            (<[string, ObjectLiteral]>part.queryParams).push(whereParam);
            this._queryParts.push(part);
        }
        return this;
    }

    private createJoinCondition(joinProperty: string, joinConditionProperty: string): void {
        // alias.property
        let joinPropertyFull: string = `${this._lastAlias}.${joinProperty}`;
        // alias_property
        let joinAlias: string = `${this._lastAlias}_${joinProperty}`;
        this._lastAlias = joinAlias;
        // alias_property.conditionProperty
        let joinCondition: string = `${joinAlias}.${joinConditionProperty}`;

        let joinFunction: (property: string, aliasName: string, condition?: string) => SelectQueryBuilder<T> = null;
        if (this._queryWhereType === QueryWhereType.Include) {
            joinFunction = this._query.leftJoinAndSelect;
        }
        else {
            joinFunction = this._query.innerJoin;
        }

        this._queryParts.push(new QueryBuilderPart(
            joinFunction, [joinPropertyFull, joinAlias, joinCondition]
        ));
    }

    private includePropertyUsingAlias<S>(propertySelector: (obj: T | P) => S | S[], queryAlias: string): IQuery<T, R, S> {
        let propertyName: string = nameof<P>(propertySelector);
        let resultAlias: string = `${queryAlias}_${propertyName}`;
        this._lastAlias = resultAlias;
        // If just passing through a chain of possibly already executed includes for semantics, don't execute the include again.
        // Only execute the include if it has not been previously executed.
        if (!(this._includeAliasHistory.find(a => a === resultAlias))) {
            this._includeAliasHistory.push(resultAlias);
            let queryProperty: string = `${queryAlias}.${propertyName}`;
            this._queryParts.push(new QueryBuilderPart(
                this._query.leftJoinAndSelect, [queryProperty, resultAlias]
            ));
        }
        return <IQuery<T, R, S>><any>this;
    }
}