const { createApp, ref, computed } = Vue;

createApp({
    setup() {
        const items = ref([
            { id: 1, title: 'Book 5 第17话', summary: 'Ace主动来找Yuu，询问他是否遇到困难...' },
            { id: 2, title: '睡前故事 (SSR)', summary: 'Ace在睡前故事里悄悄握住了Yuu的手...' }
        ]);
        const searchQuery = ref('');

        const filteredItems = computed(() => {
            return items.value.filter(i => i.title.toLowerCase().includes(searchQuery.value.toLowerCase()));
        });

        const deleteItem = (id) => {
            items.value = items.value.filter(i => i.id !== id);
        };

        return { items, searchQuery, filteredItems, deleteItem };
    }
}).mount('#app');