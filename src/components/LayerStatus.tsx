interface Props {
  isError: boolean
  isFetching: boolean
  dataUpdatedAt: number
}

export default function LayerStatus({ isError, isFetching, dataUpdatedAt }: Props) {
  if (isError) {
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
        unavailable — retrying
      </span>
    )
  }
  if (isFetching && dataUpdatedAt === 0) {
    return (
      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
        loading…
      </span>
    )
  }
  return null
}
