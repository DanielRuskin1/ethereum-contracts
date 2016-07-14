require 'ethereum'

# Signin to testnet
client = Ethereum::IpcClient.new("#{ENV['HOME']}/Library/Ethereum/geth.ipc")

# Build the contract
init = Ethereum::Initializer.new("#{ENV['PWD']}/contract.sol", client)
init.build_all

# Get a contract instance
data_service = DataService.new
data_service.at(ENV['CONTRACT_ADDRESS']) # TODO: RM hardcoded address

# Figure out how many data requests there are
amount_of_data_requests = data_service.call_and_wait_get_data_request_length
amount_of_data_requests.times.each do |data_request_index|
  # Get the data request info
  data_request_info = data_service.call_and_wait_get_data_request(data_request_index - 1)

  # Add the data point
  data_service.add_data_point(data_request_index - 1, true, "Response!")
end
