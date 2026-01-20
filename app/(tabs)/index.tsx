import { getDb, notifyDatabaseChange, syncDatabase, type Todo } from '@/db/database';
import { useReactiveQuery } from '@/hooks/use-reactive-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function TabOneScreen() {
  const dbTodos = useReactiveQuery<Todo>(
    'SELECT * FROM todos ORDER BY id DESC',
    [],
    ['todos']
  );

  const [inputText, setInputText] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [pendingTodos, setPendingTodos] = useState<Todo[]>([]); // Optimistic State

  const addTodo = async () => {
    if (inputText.trim() === '') return;
    const textToAdd = inputText;

    // 1. CLEAR UI INSTANTLY
    setInputText('');

    // 2. OPTIMISTIC UPDATE: Show item immediately
    const tempId = Date.now();
    const newTodo: Todo = { id: tempId, text: textToAdd, completed: 0 };
    setPendingTodos(prev => [newTodo, ...prev]);

    try {
      const start = performance.now();
      console.log('[Perf] Starting addTodo (Background Write)');
      const db = getDb();

      // 3. BACKGROUND DB WRITE (Accept the 1.6s delay here, UI is already updated)
      // Note: We use executeSync in a promise wrapper effectively by not awaiting the result *to block the UI painting* 
      // but here we are in an async function.
      // Actually, since we already updated the state, the UI has re-rendered.
      // We await here just to know when to remove the pending item.
      await db.execute('INSERT INTO todos (text) VALUES (?)', [textToAdd]);

      console.log('[Perf] DB Insert finished in:', performance.now() - start, 'ms');

      // 4. RECONCILIATION: DB has the item now (via useReactiveQuery), so remove pending
      notifyDatabaseChange();
      // Small delay to ensure the hook catches the new data before we remove the pending one
      // to avoid a "flicker" (Item disappears from pending -> appears from DB)
      setTimeout(() => {
        setPendingTodos(prev => prev.filter(t => t.id !== tempId));
      }, 100);

    } catch (e) {
      console.error('Failed to add todo', e);
      // Rollback on failure
      setPendingTodos(prev => prev.filter(t => t.id !== tempId));
      setInputText(textToAdd); // Restore text
      alert('Failed to save task.');
    }
  };

  const toggleTodo = async (id: number, completed: number) => {
    // For toggle, we can also be optimistic, but let's stick to Add first.
    // Ideally we update local state first.
    try {
      const db = getDb();
      await db.execute('UPDATE todos SET completed = ? WHERE id = ?', [completed ? 0 : 1, id]);
      notifyDatabaseChange();
    } catch (e) {
      console.error('Failed to toggle todo', e);
    }
  };

  const performSync = async () => {
    setSyncing(true);
    try {
      await syncDatabase();
      console.log('Synced!');
    } catch (e) {
      console.error('Sync error', e);
    } finally {
      setSyncing(false);
    }
  };

  // Merge Pending + DB (Pending on top)
  const displayTodos = [...pendingTodos, ...dbTodos];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Turso Sync (Optimistic)</Text>
        <TouchableOpacity onPress={performSync} disabled={syncing}>
          {syncing ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.syncButton}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="New task..."
          placeholderTextColor="#888"
        />
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayTodos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.todoItem}
            onPress={() => toggleTodo(item.id, item.completed)}
          >
            <Text style={[styles.todoText, item.completed === 1 && styles.completedText]}>
              {item.text}
            </Text>
            <View style={[styles.checkbox, item.completed === 1 && styles.checked]} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  syncButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    color: '#000',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  todoText: {
    fontSize: 16,
    color: '#000',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  checked: {
    backgroundColor: '#007AFF',
  },
});
