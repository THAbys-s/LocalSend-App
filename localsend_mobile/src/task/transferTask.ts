import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

export const TRANSFER_TASK = 'TRANSFER_BACKGROUND_TASK';

TaskManager.defineTask(TRANSFER_TASK, async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'LocalSend',
      body: 'Transferencia en curso...',
      sticky: true,
    },
    trigger: null,
  });

  return TaskManager.TaskManagerTaskBehavior;
});