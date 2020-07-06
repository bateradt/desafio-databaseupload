import fs from 'fs';
import csvParse from 'csv-parse';
import { In, getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface TransactionsCSV {
  title: string;
  type: string;
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const contactsReadStream = fs.createReadStream(csvFilePath);

    try {
      const parsers = csvParse({
        delimiter: ',',
        from_line: 2,
      });

      const parseCSV = contactsReadStream.pipe(parsers);

      const transactions: TransactionsCSV[] = [];
      const categories: string[] = [];

      parseCSV.on('data', async line => {
        const [title, type, value, category] = line.map((cell: string) =>
          cell.trim(),
        );

        if (!title || !type || !value || !category) return;

        categories.push(category);

        transactions.push({ title, type, value, category });
      });

      await new Promise(resolve => parseCSV.on('end', resolve)).catch(error => {
        throw new AppError(
          `This file is in the wrong format ${error.message}`,
          400,
        );
      });

      const existsCategories = await categoryRepository.find({
        where: { title: In(categories) },
      });

      const existCategoryTitles = existsCategories.map(
        (category: Category) => category.title,
      );

      const addCategoryTitle = categories
        .filter(category => !existCategoryTitles.includes(category))
        .filter((value, index, self) => self.indexOf(value) === index);

      const newCategories = categoryRepository.create(
        addCategoryTitle.map(title => ({
          title,
        })),
      );

      await categoryRepository.save(newCategories);

      const finalCategories = [...newCategories, ...existsCategories];

      const createdTransactions = transactionsRepository.create(
        transactions.map(transaction => ({
          title: transaction.title,
          type: transaction.type,
          value: transaction.value,
          category: finalCategories.find(
            category => category.title === transaction.category,
          ),
        })),
      );

      await transactionsRepository.save(createdTransactions);

      await fs.promises.unlink(csvFilePath);

      return createdTransactions;
    } catch {
      throw new AppError('This file is in the wrong format', 400);
    }
  }
}

export default ImportTransactionsService;
