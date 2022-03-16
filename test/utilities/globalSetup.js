import { SQLDatabase } from '../../src/DataAccess/SQLDatabase'


module.exports = async () => {
    await SQLDatabase.ensureDBExtensions()
};