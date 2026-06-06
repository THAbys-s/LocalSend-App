import Store from 'electron-store';

const schema = {
  alias: { type: 'string', default: 'LocalSend' },
  destination: { type: 'string', default: '' },
};

export const configStore = new Store({
  name: 'config',
  schema,
});
