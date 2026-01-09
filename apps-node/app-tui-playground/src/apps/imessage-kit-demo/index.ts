import { IMessageSDK } from '@photon-ai/imessage-kit';
import { differenceInDays } from 'date-fns';

const sdk = new IMessageSDK({
  debug: true,
  watcher: {
    pollInterval: 1000, // default: 2000
    unreadOnly: false,
    excludeOwnMessages: true,
  },
});

const allChats = await sdk.listChats();
const dmChats = allChats.filter((chat) => !chat.isGroup);
const imChats = dmChats.filter((chat) => chat.chatId.startsWith('iMessage;'));
const last3DayChats = imChats.filter(
  (chat) => chat.lastMessageAt && differenceInDays(new Date(), new Date(chat.lastMessageAt)) <= 3
);

console.log(last3DayChats);
