import React from 'react'
import * as q from '../../../../backend/src/Model'
import TopicChart from './TopicChart'
import { ChartParameters } from '../../reducers/Charts'
import { usePollingToFetchTreeNode } from '../helper/usePollingToFetchTreeNode'

interface Props {
  tree?: q.Tree<any>
  parameters: ChartParameters
}

export function ChartWithTreeNode(props: Props) {
  const { tree, parameters } = props
  // Hooks must run on every render, also while there is no tree (e.g. before connecting)
  const treeNode = usePollingToFetchTreeNode(tree, parameters.topic)
  if (!tree) {
    return null
  }

  return <TopicChart treeNode={treeNode} parameters={parameters} />
}
