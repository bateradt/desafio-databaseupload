import { getCustomRepository } from 'typeorm';
import { isUuid } from 'uuidv4';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<boolean> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (!isUuid(id)) {
      throw new AppError('Transaction ID is invalid', 400);
    }

    const deleted = await transactionsRepository.delete(id);

    if (!deleted) {
      throw new AppError('Transaction can´t be deleted', 400);
    }

    if (deleted.affected === 0) {
      throw new AppError('Transaction can´t be found', 400);
    }

    return true;
  }
}

export default DeleteTransactionService;
