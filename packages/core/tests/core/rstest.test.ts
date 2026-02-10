import { join } from 'pathe';
import { Rstest } from '../../src/core/rstest';

// Mock std-env to ensure consistent snapshot across environments
rs.mock('std-env', () => ({
  isCI: false,
}));

process.env.DEBUG = 'false';

const rootPath = join(__dirname, '../..');

describe('rstest context', () => {
  it('should generate rstest context correctly', async () => {
    const rstestContext = new Rstest(
      {
        cwd: rootPath,
        command: 'run',
        projects: [],
      },
      {},
    );

    expect(rstestContext.projects[0]!.normalizedConfig).toMatchSnapshot();
  });

  it('should generate rstest context correctly with multiple projects', async () => {
    const rstestContext = new Rstest(
      {
        cwd: rootPath,
        command: 'run',
        projects: [
          {
            config: {
              root: join(rootPath, 'test-project'),
              name: 'test-project',
              include: ['<rootDir>/tests/**/*.test.ts'],
              setupFiles: '<rootDir>/scripts/rstest.setup.ts',
            },
          },
          {
            config: {
              root: 'test-project1',
              name: 'test-project1',
              setupFiles: ['<rootDir>/scripts/rstest.setup.ts'],
            },
          },
        ],
      },
      {},
    );

    expect(rstestContext.projects[0]!.normalizedConfig).toMatchSnapshot();
    expect(rstestContext.projects[1]!.normalizedConfig).toMatchSnapshot();
  });
});

describe('rstest federation compatibility', () => {
  it('should allow federation with ESM output in browser mode', () => {
    expect(() => {
      new Rstest(
        {
          cwd: rootPath,
          command: 'run',
          projects: [],
        },
        {
          federation: true,
          browser: {
            enabled: true,
            provider: 'playwright',
          },
          output: {
            module: true,
          },
        },
      );
    }).not.toThrow();
  });

  it('should throw when federation uses ESM output in node mode', () => {
    expect(() => {
      new Rstest(
        {
          cwd: rootPath,
          command: 'run',
          projects: [],
        },
        {
          federation: true,
          output: {
            module: true,
          },
        },
      );
    }).toThrow(
      'Federation compatibility mode for Node tests requires CommonJS output.',
    );
  });
});
