import { getDb, notifyDatabaseChange, syncDatabase, type Todo } from '@/db/database';
import { useReactiveQuery } from '@/hooks/use-reactive-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function TabOneScreen() {
  const todos = useReactiveQuery<Todo>(
    'SELECT * FROM todos ORDER BY id DESC',
    [],
    ['todos']
  );

  const [inputText, setInputText] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Removed manual loadTodos since the hook handles it reactively

  const addTodo = async () => {
    if (inputText.trim() === '') return;
    try {
      const db = getDb();
      await db.execute('INSERT INTO todos (text) VALUES (?)', [inputText]);
      setInputText('');
      notifyDatabaseChange(); // Update UI immediately
      performSync();
    } catch (e) {
      console.error('Failed to add todo', e);
    }
  };

  const toggleTodo = async (id: number, completed: number) => {
    try {
      const db = getDb();
      await db.execute('UPDATE todos SET completed = ? WHERE id = ?', [completed ? 0 : 1, id]);
      notifyDatabaseChange(); // Update UI immediately
      performSync();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Turso Sync (op-sqlite)</Text>
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
        data={todos}
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
