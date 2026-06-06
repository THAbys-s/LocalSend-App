import { create } from 'zustand';
import { TransferRequest } from '../../shared/transfer.types';

type State = {
  transfers: TransferRequest[];
  addTransfer: (transfer: TransferRequest) => void;
};

export const useTransferStore = create<State>((set) => ({
  transfers: [],
  addTransfer: (transfer) => set((state) => ({ transfers: [...state.transfers, transfer] })),
}));
