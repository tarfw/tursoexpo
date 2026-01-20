import { addDatabaseChangeListener, getDb } from '@/db/database';
import { useCallback, useEffect, useState } from 'react';

export function useReactiveQuery<T>(query: string, params: any[] = [], affectedTables: string[] = []) {
    const [data, setData] = useState<T[]>([]);

    const fetchData = useCallback(() => {
        const db = getDb();
        db.execute(query, params).then((result) => {
            // @ts-ignore
            setData(result.rows?._array || result.rows || []);
        });
    }, [query, JSON.stringify(params)]);

    useEffect(() => {
        // Initial fetch
        fetchData();

        // Subscribe to changes
        const unsubscribe = addDatabaseChangeListener(() => {
            fetchData();
        });

        return () => {
            unsubscribe();
        };
    }, [fetchData]);

    return data;
}
