
import { ImportWorkflow } from "@/components/excel-import/ImportWorkflow";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 lg:p-12 max-w-7xl mx-auto w-full">
      <div className="z-10 w-full items-center justify-between font-mono text-sm flex mb-12">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          Universal Excel Importer &nbsp;
          <code className="font-bold text-primary">v1.0.0</code>
        </p>
        <ThemeToggle />
      </div>

      <div className="relative flex flex-col items-center w-full">
        <div className="flex flex-col space-y-2 mb-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            万能 Excel 导入系统
          </h1>
          <p className="text-muted-foreground text-lg">
            支持智能模板识别、实时数据校验、批量编辑与历史追溯
          </p>
        </div>

        <ImportWorkflow />
      </div>

      {/* Background Decorative Elements */}
      <div className="fixed bottom-0 left-0 right-0 top-0 -z-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from),_transparent_40%)] from-primary/10" />
      <div className="fixed bottom-0 left-0 right-0 top-0 -z-10 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-from),_transparent_40%)] from-primary/5" />
    </main>
  );
}
