const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
    setup() {
        const items = ref([]);
        const showModal = ref(false);
        const searchQuery = ref('');
        const form = ref({ id: null, title: '', category: 'Ace', source: '主线' });

        // 加载数据
        onMounted(() => {
            const saved = localStorage.getItem('ay_archive');
            if (saved) items.value = JSON.parse(saved);
        });

        // 自动保存
        watch(items, (newVal) => {
            localStorage.setItem('ay_archive', JSON.stringify(newVal));
        }, { deep: true });

        const filteredItems = computed(() => {
            return items.value.filter(i => i.title.toLowerCase().includes(searchQuery.value.toLowerCase()));
        });

        const openModal = () => { 
            form.value = { id: null, title: '', category: 'Ace', source: '主线' }; 
            showModal.value = true; 
        };
        
        const editItem = (item) => { 
            form.value = { ...item }; 
            showModal.value = true; 
        };
        
        const deleteItem = (id) => { 
            if(confirm('确认删除此条目？')) {
                items.value = items.value.filter(i => i.id !== id);
            }
        };
        
        const saveItem = () => {
            if (!form.value.title.trim()) return alert('标题不能为空');
            if (form.value.id) {
                const idx = items.value.findIndex(i => i.id === form.value.id);
                items.value[idx] = { ...form.value };
            } else {
                items.value.push({ ...form.value, id: Date.now() });
            }
            showModal.value = false;
        };

        return { 
            items, 
            filteredItems, 
            showModal, 
            form, 
            searchQuery, 
            openModal, 
            editItem, 
            deleteItem, 
            saveItem 
        };
    }
}).mount('#app');